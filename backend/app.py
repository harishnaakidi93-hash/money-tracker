import math
import os
from datetime import date
from decimal import Decimal, InvalidOperation

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ProgrammingError

load_dotenv()
db = SQLAlchemy()


def create_database_if_missing(database_url):
    url = make_url(database_url)
    if url.get_backend_name() != "postgresql":
        return

    database_name = url.database
    admin_engine = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    try:
        with admin_engine.connect() as connection:
            exists = connection.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": database_name},
            ).scalar()
            if not exists:
                quoted_name = connection.dialect.identifier_preparer.quote(database_name)
                try:
                    connection.execute(text(f"CREATE DATABASE {quoted_name}"))
                except ProgrammingError as error:
                    if getattr(error.orig, "sqlstate", None) != "42P04":
                        raise
    finally:
        admin_engine.dispose()


class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(120), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    kind = db.Column(db.String(10), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)


def create_app():
    app = Flask(__name__)
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg:///money_tracker",
    )
    create_database_if_missing(database_url)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

    @app.get("/")
    def index():
        return Response(
            """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Daybook API</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: sans-serif; background: #f4f7f5; color: #17352b; }
    main { padding: 2rem; text-align: center; }
    h1 { margin-bottom: .5rem; }
    p { margin: 0; color: #527067; }
    code { display: inline-block; margin-top: 1.5rem; padding: .75rem 1rem; border-radius: .5rem; background: #17352b; color: white; }
  </style>
</head>
<body>
  <main>
    <h1>Daybook is running</h1>
    <p>The backend API is ready to serve your money tracker.</p>
    <code>http://localhost:5000/api/transactions</code>
  </main>
</body>
</html>""",
            mimetype="text/html",
        )

    @app.get("/api/transactions")
    def get_transactions():
        entries = db.session.scalars(
            db.select(Transaction).order_by(Transaction.date.desc(), Transaction.id.desc())
        ).all()
        return jsonify([serialize(entry) for entry in entries])

    @app.post("/api/transactions")
    def add_transaction():
        payload = request.get_json(silent=True) or {}
        description = str(payload.get("description", "")).strip()
        kind = payload.get("kind")

        try:
            amount = Decimal(str(payload.get("amount", "")))
            entry_date = date.fromisoformat(payload.get("date", date.today().isoformat()))
        except (InvalidOperation, TypeError, ValueError):
            return jsonify(error="Enter a valid amount and date."), 400

        if not description or len(description) > 120:
            return jsonify(error="Description must be 1 to 120 characters."), 400
        if not amount.is_finite() or amount <= 0 or not math.isfinite(float(amount)):
            return jsonify(error="Amount must be a positive number."), 400
        if kind not in ("income", "expense"):
            return jsonify(error="Kind must be income or expense."), 400

        entry = Transaction(
            description=description,
            amount=amount.quantize(Decimal("0.01")),
            kind=kind,
            date=entry_date,
        )
        db.session.add(entry)
        db.session.commit()
        return jsonify(serialize(entry)), 201

    @app.delete("/api/transactions/<int:entry_id>")
    def delete_transaction(entry_id):
        entry = db.session.get(Transaction, entry_id)
        if entry is None:
            return jsonify(error="Transaction not found."), 404
        db.session.delete(entry)
        db.session.commit()
        return "", 204

    with app.app_context():
        db.create_all()

    return app


def serialize(entry):
    return {
        "id": entry.id,
        "description": entry.description,
        "amount": float(entry.amount),
        "kind": entry.kind,
        "date": entry.date.isoformat(),
    }


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
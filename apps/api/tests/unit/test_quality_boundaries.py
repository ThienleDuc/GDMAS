"""Bảo vệ hợp đồng trước/sau bảo trì backend; snapshot lấy trước khi sửa nguồn."""

import ast
import hashlib
import json
from pathlib import Path

from sqlalchemy.dialects import postgresql

from gdmas import models, schemas
from gdmas.db.base import Base
from gdmas.main import app

API_DIR = Path(__file__).resolve().parents[2]
FIXTURE = API_DIR / "tests/fixtures/quality_contracts.json"


def _normalized_hash(path):
    return hashlib.sha256(path.read_text(encoding="utf-8").encode("utf-8")).hexdigest()


def _current_contracts():
    dialect = postgresql.dialect()
    tables = {}
    for table in Base.metadata.sorted_tables:
        tables[table.name] = {
            "columns": [
                {
                    "name": column.name,
                    "type": str(column.type.compile(dialect=dialect)),
                    "nullable": column.nullable,
                    "primary_key": column.primary_key,
                    "server_default": str(column.server_default.arg)
                    if column.server_default is not None
                    else None,
                    "foreign_keys": sorted(
                        key.target_fullname for key in column.foreign_keys
                    ),
                }
                for column in table.columns
            ],
            "indexes": sorted(
                (index.name, index.unique, [str(expr) for expr in index.expressions])
                for index in table.indexes
            ),
            "constraints": sorted(
                (
                    type(constraint).__name__,
                    constraint.name or "",
                    [column.name for column in constraint.columns],
                )
                for constraint in table.constraints
            ),
        }
    config_ast = ast.parse(
        (API_DIR / "src/gdmas/core/config.py").read_text(encoding="utf-8")
    )
    settings_class = next(
        node
        for node in config_ast.body
        if isinstance(node, ast.ClassDef) and node.name == "Settings"
    )
    defaults = [
        (node.target.id, ast.dump(node.value, include_attributes=False))
        for node in settings_class.body
        if isinstance(node, ast.AnnAssign)
        and isinstance(node.target, ast.Name)
        and node.value is not None
    ]
    return {
        "openapi": app.openapi(),
        "orm": tables,
        "exports": {
            "models": sorted(models.__all__),
            "schemas": sorted(schemas.__all__),
        },
        "config_defaults_sha256": hashlib.sha256(
            json.dumps(defaults, sort_keys=True).encode()
        ).hexdigest(),
        "migration_sha256": _normalized_hash(
            API_DIR / "alembic/versions/001_initial_gdmas_schema.py"
        ),
    }


def _expected():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_openapi_contract_is_unchanged():
    assert _current_contracts()["openapi"] == _expected()["openapi"]


def test_orm_columns_constraints_and_indexes_are_unchanged():
    actual = json.loads(json.dumps(_current_contracts()["orm"]))
    assert actual == _expected()["orm"]


def test_public_model_and_schema_exports_are_preserved():
    assert _current_contracts()["exports"] == _expected()["exports"]
    assert {name for name in models.__all__ if name != "Base"} == {
        mapper.class_.__name__ for mapper in Base.registry.mappers
    }


def test_config_default_values_are_unchanged():
    assert (
        _current_contracts()["config_defaults_sha256"]
        == _expected()["config_defaults_sha256"]
    )


def test_existing_migration_is_unchanged():
    assert _current_contracts()["migration_sha256"] == _expected()["migration_sha256"]

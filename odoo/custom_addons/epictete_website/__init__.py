from . import models
from . import controllers

from .models.section import SECTION_DEFS


def post_init_hook(env):
    """Seed the 7 website sections and their known fields so the client sees a
    ready-to-fill, labelled form per section. Idempotent: existing sections /
    fields are left untouched; only missing ones are created."""
    Section = env["website.section"].sudo()
    Field = env["website.section.field"].sudo()
    for key, spec in SECTION_DEFS.items():
        section = Section.search([("key", "=", key)], limit=1)
        if not section:
            section = Section.create({"key": key, "name": spec["name"]})
        existing_keys = set(section.field_ids.mapped("key"))
        seq = len(existing_keys)
        for field_key, label, field_type in spec["fields"]:
            if field_key in existing_keys:
                continue
            seq += 1
            Field.create({
                "section_id": section.id,
                "key": field_key,
                "label": label,
                "field_type": field_type,
                "sequence": seq,
            })

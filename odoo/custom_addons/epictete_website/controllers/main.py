import logging

from odoo import http, SUPERUSER_ID
from odoo.http import request

_logger = logging.getLogger(__name__)

# Shared secret (same value both directions): the site sends it here to pull
# content; the addon sends it to the site's /api/publish webhook on save.
# Set in Settings > Technical > Parameters: epictete_website.secret
SECRET_PARAM = "epictete_website.secret"


def _split_csv(value):
    return [v.strip() for v in (value or "").split(",") if v.strip()]


class WebsiteContentController(http.Controller):
    """Serves the full website content as JSON to the Epictete site's publish
    step, which turns it into a Blob snapshot (content + mirrored images)."""

    @http.route(
        "/epictete/website/content", type="http", auth="none",
        methods=["GET"], csrf=False, save_session=False,
    )
    def content(self, **kw):
        def resp(data, code=200):
            return request.make_json_response(data, status=code)

        secret = request.httprequest.headers.get("X-Epictete-Secret") or kw.get("secret")
        expected = request.env["ir.config_parameter"].sudo().get_param(SECRET_PARAM)
        if not expected or secret != expected:
            return resp({"ok": False, "error": "unauthorized"}, 401)

        try:
            env = request.env(user=SUPERUSER_ID)
            payload = {
                "ok": True,
                "menu": self._menu_payload(env),
                "sections": self._sections_payload(env),
            }
            return resp(payload)
        except Exception as e:  # noqa
            _logger.exception("epictete_website: content export failed")
            return resp({"ok": False, "error": str(e)[:200]}, 500)

    # ---- builders ----
    def _menu_payload(self, env):
        categories = env["website.menu.category"].search([("active", "=", True)])
        items = env["website.menu.item"].search([])
        return {
            "categories": [{
                "id": c.id,
                "name": c.name or "",
                "name_en": c.name_en or "",
                "sequence": c.sequence,
            } for c in categories],
            "items": [{
                "id": i.id,
                "category_id": i.category_id.id,
                "name": i.name or "",
                "name_en": i.name_en or "",
                "description": i.description or "",
                "description_en": i.description_en or "",
                "price": i.price,
                "is_available": i.is_available,
                "is_featured": i.is_featured,
                "sequence": i.sequence,
                "allergens": _split_csv(i.allergens),
                "tags": _split_csv(i.tags),
                # Odoo Image fields store base64 already; decode bytes -> str.
                "image": (i.image.decode() if i.image else None),
                "image_filename": ("item-%s.png" % i.id) if i.image else None,
            } for i in items],
        }

    def _sections_payload(self, env):
        out = {}
        for s in env["website.section"].search([]):
            fr, en = {}, {}
            for f in s.field_ids:
                if f.value_fr:
                    fr[f.key] = f.value_fr
                if f.value_en:
                    en[f.key] = f.value_en
            block = {"fr": fr, "en": en}
            if s.key == "testimonials":
                block["reviews"] = [{
                    "name": t.author_name or "",
                    "role": t.role or "",
                    "content": t.content or "",
                    "source": t.source or "",
                    "rating": t.rating or 5,
                } for t in s.testimonial_ids]
            out[s.key] = block
        return out

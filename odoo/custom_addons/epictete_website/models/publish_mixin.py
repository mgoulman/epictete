import json
import logging
import urllib.request

from odoo import api, models

_logger = logging.getLogger(__name__)

# ir.config_parameter keys (set per instance in Settings > Technical > Parameters):
#   epictete_website.publish_url  -> the site's publish webhook, e.g.
#                                    https://epictete.ma/api/publish
#   epictete_website.secret       -> shared secret, sent as X-Epictete-Secret
#                                    (same value the site uses to pull content)
PARAM_URL = "epictete_website.publish_url"
PARAM_SECRET = "epictete_website.secret"


class WebsitePublishMixin(models.AbstractModel):
    """Mixin for every website-content model. Any create/write/unlink pings the
    site's publish webhook once, after the transaction commits, so the site
    regenerates its Blob snapshot (content JSON + mirrored images). Fire-and-
    forget: a webhook failure must never block or roll back an edit in Odoo.
    """
    _name = "website.publish.mixin"
    _description = "Website content publish trigger"

    def _trigger_website_publish(self):
        """Register a single post-commit ping (deduped per transaction)."""
        if not self:
            return
        cr = self.env.cr
        # Dedupe: only arm the post-commit hook once per transaction.
        if getattr(cr, "_epictete_website_publish_armed", False):
            return
        cr._epictete_website_publish_armed = True
        env = self.env

        def _ping():
            url = env["ir.config_parameter"].sudo().get_param(PARAM_URL)
            secret = env["ir.config_parameter"].sudo().get_param(PARAM_SECRET)
            if not url or not secret:
                _logger.info("epictete_website: publish webhook not configured; skipping ping")
                return
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps({"event": "content.changed"}).encode("utf-8"),
                    headers={"Content-Type": "application/json", "X-Epictete-Secret": secret},
                    method="POST",
                )
                urllib.request.urlopen(req, timeout=10)  # noqa: S310 (trusted, configured URL)
            except Exception:  # a publish problem must never surface to the editor
                _logger.exception("epictete_website: publish webhook ping failed")

        cr.postcommit.add(_ping)

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        records._trigger_website_publish()
        return records

    def write(self, vals):
        res = super().write(vals)
        self._trigger_website_publish()
        return res

    def unlink(self):
        # Capture the trigger before the rows are gone.
        self._trigger_website_publish()
        return super().unlink()

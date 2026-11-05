from odoo import fields, models


class WebsiteMenuCategory(models.Model):
    _name = "website.menu.category"
    _description = "Categorie du menu (site web)"
    _inherit = ["website.publish.mixin"]
    _order = "sequence, id"

    name = fields.Char("Nom (FR)", required=True, translate=False)
    name_en = fields.Char("Nom (EN)")
    sequence = fields.Integer("Ordre", default=10)
    active = fields.Boolean("Actif", default=True)
    item_ids = fields.One2many("website.menu.item", "category_id", string="Plats")
    item_count = fields.Integer("Nb plats", compute="_compute_item_count")

    def _compute_item_count(self):
        for c in self:
            c.item_count = len(c.item_ids)


class WebsiteMenuItem(models.Model):
    _name = "website.menu.item"
    _description = "Plat du menu (site web)"
    _inherit = ["website.publish.mixin"]
    _order = "sequence, id"

    name = fields.Char("Nom (FR)", required=True)
    name_en = fields.Char("Nom (EN)")
    description = fields.Text("Description (FR)")
    description_en = fields.Text("Description (EN)")
    price = fields.Float("Prix (MAD)", default=0.0)
    category_id = fields.Many2one(
        "website.menu.category", string="Categorie", required=True, ondelete="cascade",
    )
    image = fields.Image("Image", max_width=1920, max_height=1920)
    is_available = fields.Boolean("Disponible", default=True)
    is_featured = fields.Boolean("Mis en avant", default=False)
    sequence = fields.Integer("Ordre", default=10)
    # Comma-separated values; kept simple and 1:1 with the current site data.
    allergens = fields.Char("Allergenes", help="Separes par des virgules, ex: gluten, lactose")
    tags = fields.Char("Tags", help="Separes par des virgules, ex: vegetarien, epice")

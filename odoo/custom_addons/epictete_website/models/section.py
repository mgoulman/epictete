from odoo import fields, models

# The 7 home-page sections and their editable fields, mirrored 1:1 from the
# website's lib/types/site-content.ts (SECTION_FIELDS). Each tuple is
# (field_key, french_label, field_type). field_type: "char" (one line) or
# "text" (multi-line). Labels are what the client sees in Odoo (French).
SECTION_DEFS = {
    "hero": {
        "name": "Accueil (Hero)",
        "fields": [
            ("welcome", "Message de bienvenue", "char"),
            ("tagline", "Slogan", "char"),
            ("taglineAccent", "Slogan - mot accentue", "char"),
            ("description", "Description", "text"),
        ],
    },
    "philosophy": {
        "name": "Philosophie",
        "fields": [
            ("title", "Titre", "char"),
            ("titleAccent", "Titre - mot accentue", "char"),
            ("description", "Description", "text"),
            ("organic", "Bio - titre", "char"),
            ("organicDesc", "Bio - description", "text"),
            ("woodFired", "Feu de bois - titre", "char"),
            ("woodFiredDesc", "Feu de bois - description", "text"),
            ("homemade", "Fait maison - titre", "char"),
            ("homemadeDesc", "Fait maison - description", "text"),
            ("stat1Number", "Statistique 1 - chiffre", "char"),
            ("stat1Label", "Statistique 1 - libelle", "char"),
            ("stat2Number", "Statistique 2 - chiffre", "char"),
            ("stat2Label", "Statistique 2 - libelle", "char"),
            ("stat3Number", "Statistique 3 - chiffre", "char"),
            ("stat3Label", "Statistique 3 - libelle", "char"),
        ],
    },
    "gallery": {
        "name": "Galerie",
        "fields": [
            ("eyebrow", "Sur-titre", "char"),
            ("title", "Titre", "char"),
            ("description", "Description", "text"),
        ],
    },
    "featuredDishes": {
        "name": "Plats a la une",
        "fields": [
            ("eyebrow", "Sur-titre", "char"),
            ("title", "Titre", "char"),
            ("description", "Description", "text"),
        ],
    },
    "testimonials": {
        "name": "Temoignages",
        "fields": [
            ("eyebrow", "Sur-titre", "char"),
            ("title", "Titre", "char"),
            ("description", "Description", "text"),
            ("followInstagram", "Texte 'Suivez-nous sur Instagram'", "char"),
        ],
    },
    "location": {
        "name": "Emplacement",
        "fields": [
            ("eyebrow", "Sur-titre", "char"),
            ("title", "Titre", "char"),
            ("description", "Description", "text"),
        ],
    },
    "cta": {
        "name": "Appel a l'action (CTA)",
        "fields": [
            ("eyebrow", "Sur-titre", "char"),
            ("title", "Titre", "char"),
            ("titleAccent", "Titre - mot accentue", "char"),
            ("description", "Description", "text"),
        ],
    },
}

SECTION_KEYS = [(k, v["name"]) for k, v in SECTION_DEFS.items()]


class WebsiteSection(models.Model):
    _name = "website.section"
    _description = "Section de contenu du site web"
    _inherit = ["website.publish.mixin"]
    _order = "id"
    _rec_name = "name"

    key = fields.Selection(SECTION_KEYS, string="Section", required=True, readonly=True)
    name = fields.Char("Nom", required=True, readonly=True)
    field_ids = fields.One2many("website.section.field", "section_id", string="Champs")
    # Only populated for the testimonials section.
    testimonial_ids = fields.One2many("website.testimonial", "section_id", string="Temoignages")
    is_testimonials = fields.Boolean(compute="_compute_is_testimonials")

    _sql_constraints = [("key_uniq", "unique(key)", "Cette section existe deja.")]

    def _compute_is_testimonials(self):
        for s in self:
            s.is_testimonials = s.key == "testimonials"


class WebsiteSectionField(models.Model):
    _name = "website.section.field"
    _description = "Champ de contenu (bilingue) d'une section"
    _inherit = ["website.publish.mixin"]
    _order = "sequence, id"

    section_id = fields.Many2one("website.section", required=True, ondelete="cascade")
    key = fields.Char("Cle", required=True, readonly=True)
    label = fields.Char("Libelle", readonly=True)
    field_type = fields.Selection(
        [("char", "Une ligne"), ("text", "Paragraphe")], default="char", readonly=True,
    )
    value_fr = fields.Text("Valeur (FR)")
    value_en = fields.Text("Valeur (EN)")
    sequence = fields.Integer("Ordre", default=10)


class WebsiteTestimonial(models.Model):
    _name = "website.testimonial"
    _description = "Temoignage client (site web)"
    _inherit = ["website.publish.mixin"]
    _order = "sequence, id"

    section_id = fields.Many2one("website.section", ondelete="cascade")
    author_name = fields.Char("Nom", required=True)
    role = fields.Char("Role / lieu")
    content = fields.Text("Temoignage", required=True)
    source = fields.Char("Source", help="ex: Google, Instagram")
    rating = fields.Integer("Note (1-5)", default=5)
    sequence = fields.Integer("Ordre", default=10)

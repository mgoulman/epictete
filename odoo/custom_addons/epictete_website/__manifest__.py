{
    "name": "Epictete - Site web (contenu)",
    "version": "19.0.1.0.0",
    "category": "Website",
    "summary": "Source de contenu du site Epictete: menu, categories, images et textes editables depuis Odoo. Publie un instantane vers le site (Blob) a chaque enregistrement.",
    "depends": ["mail", "web", "epictete_rbac"],
    "data": [
        "security/groups.xml",
        "security/ir.model.access.csv",
        "views/menu_views.xml",
        "views/section_views.xml",
        "views/menu_root.xml",
    ],
    "post_init_hook": "post_init_hook",
    "installable": True,
    "application": True,
    "license": "LGPL-3",
}

{
    'name': 'Epictète — Assistant Douchette',
    'version': '19.0.1.0.0',
    'summary': 'Vendor bill barcode scanner — adds a "Assistant douchette" button that scans products onto a draft bill with empty quantity/price for manual entry',
    'category': 'Accounting',
    'depends': ['account', 'product'],
    'data': [
        'security/ir.model.access.csv',
        'views/account_invoice_scan_wizard_views.xml',
        'views/account_move_views.xml',
    ],
    'installable': True,
    'license': 'LGPL-3',
}
from odoo import _, api, fields, models
from odoo.exceptions import UserError


class AccountInvoiceScanWizard(models.TransientModel):
    _name = 'account.invoice.scan.wizard'
    _description = 'Assistant douchette — scan products onto a vendor bill'

    move_id = fields.Many2one(
        'account.move', string='Facture', required=True,
        domain=[('move_type', '=', 'in_invoice')],
    )
    partner_id = fields.Many2one(
        'res.partner', related='move_id.partner_id',
        string='Fournisseur', readonly=True,
    )
    currency_id = fields.Many2one(
        'res.currency', related='move_id.currency_id', readonly=True,
    )
    barcode = fields.Char(
        string='Code-barres',
        help="Scannez un code-barres avec votre douchette, puis cliquez « Ajouter » "
             "(ou Enter). Chaque scan ajoute une ligne vide sur la facture : vous "
             "remplirez quantité et prix manuellement ensuite.",
    )
    scan_line_ids = fields.One2many(
        'account.invoice.scan.wizard.line', 'wizard_id',
        string='Lignes scannées',
    )
    scan_line_count = fields.Integer(compute='_compute_scan_line_count')
    last_scan_message = fields.Char(readonly=True)

    @api.depends('scan_line_ids')
    def _compute_scan_line_count(self):
        for wiz in self:
            wiz.scan_line_count = len(wiz.scan_line_ids)

    def action_scan(self):
        """Look up the product by barcode and append a new (empty) line on the
        wizard. Each scan produces its own line so the user can enter a different
        quantity or unit price per physical item on the invoice."""
        self.ensure_one()
        barcode = (self.barcode or '').strip()
        if not barcode:
            raise UserError(_("Scannez un code-barres d'abord."))
        product = self.env['product.product'].search(
            [('barcode', '=', barcode)], limit=1,
        )
        if not product:
            raise UserError(
                _("Aucun produit trouvé avec le code-barres '%s'.") % barcode
            )
        self.env['account.invoice.scan.wizard.line'].create({
            'wizard_id': self.id,
            'product_id': product.id,
            'name': product.display_name,
        })
        self.write({
            'barcode': False,
            'last_scan_message': _('✓ %s') % product.display_name,
        })
        # Reopen the wizard in the same dialog so the barcode field stays focused
        # and ready for the next scan.
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'account.invoice.scan.wizard',
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }

    def action_confirm(self):
        """Push every scanned line onto the vendor bill with quantity=0 and
        price_unit=0. The user fills those values manually on the bill afterwards."""
        self.ensure_one()
        if not self.scan_line_ids:
            raise UserError(_(
                "Aucune ligne scannée. Scannez au moins un produit avant de "
                "transférer sur la facture."
            ))
        AccountMoveLine = self.env['account.move.line']
        lines_vals = []
        for scan in self.scan_line_ids:
            product = scan.product_id
            vals = {
                'move_id': self.move_id.id,
                'product_id': product.id,
                'name': product.display_name,
                'quantity': 0.0,
                'price_unit': 0.0,
            }
            # Use the product's default account/taxes if configured, mirroring
            # what Odoo does when a product is picked from the product picker.
            if product.property_account_expense_id:
                vals['account_id'] = product.property_account_expense_id.id
            elif product.categ_id.property_account_expense_categ_id:
                vals['account_id'] = product.categ_id.property_account_expense_categ_id.id
            if product.supplier_taxes_id:
                vals['tax_ids'] = [(6, 0, product.supplier_taxes_id.ids)]
            lines_vals.append(vals)
        AccountMoveLine.create(lines_vals)
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'account.move',
            'res_id': self.move_id.id,
            'view_mode': 'form',
        }


class AccountInvoiceScanWizardLine(models.TransientModel):
    _name = 'account.invoice.scan.wizard.line'
    _description = 'Assistant douchette — scanned line'

    wizard_id = fields.Many2one(
        'account.invoice.scan.wizard', required=True, ondelete='cascade',
    )
    product_id = fields.Many2one(
        'product.product', string='Produit', required=True,
    )
    name = fields.Char(string='Nom du produit', required=True)
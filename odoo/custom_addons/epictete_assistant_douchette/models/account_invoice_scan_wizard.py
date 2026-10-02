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
             "(ou Enter). Chaque scan ajoute une ligne ; vous remplissez quantité, "
             "prix et montant ligne au fil de l'eau ou en une fois avant de transférer.",
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
        """Look up the product by barcode and append a new line on the wizard.
        The line starts empty (no qty, no price); the user fills them in inline."""
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
        # Reopen the wizard so the barcode field stays focused for the next scan.
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'account.invoice.scan.wizard',
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }

    def action_confirm(self):
        """Push every scanned line onto the vendor bill, preserving the qty and
        price the user typed inline. Lines missing a qty or price are still
        pushed (with 0) so the user can fill them on the bill itself."""
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
                'quantity': scan.quantity or 0.0,
                'price_unit': scan.price_unit or 0.0,
            }
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
    _order = 'id'

    wizard_id = fields.Many2one(
        'account.invoice.scan.wizard', required=True, ondelete='cascade',
    )
    product_id = fields.Many2one(
        'product.product', string='Produit', required=True,
    )
    name = fields.Char(string='Nom du produit', required=True)
    quantity = fields.Float(string='Quantité', default=0.0, digits='Product Unit of Measure')
    price_unit = fields.Float(string='Prix unitaire', default=0.0)
    # Montant ligne = quantity * price_unit (or the user-typed override that
    # takes priority, mirroring how the epictete_bill_line_total module works
    # on the bill).
    montant_ligne = fields.Float(
        string='Montant ligne',
        compute='_compute_montant_ligne',
        inverse='_inverse_montant_ligne',
        digits='Account',
        help="Total de la ligne. Modifié automatiquement quand vous tapez "
             "quantité × prix unitaire ; vous pouvez aussi le saisir directement "
             "(le prix unitaire sera recalculé).",
    )

    @api.depends('quantity', 'price_unit')
    def _compute_montant_ligne(self):
        for line in self:
            line.montant_ligne = (line.quantity or 0.0) * (line.price_unit or 0.0)

    def _inverse_montant_ligne(self):
        for line in self:
            if line.quantity:
                line.price_unit = (line.montant_ligne or 0.0) / line.quantity
            else:
                # No quantity yet — store the typed value as price_unit and
                # leave quantity at 0; the user will fill qty and the total
                # stays equal to the typed amount.
                line.price_unit = line.montant_ligne or 0.0

    @api.onchange('quantity', 'price_unit')
    def _onchange_recompute_montant(self):
        """Triggered while the user types in the list view. The compute runs
        server-side too, but onchange keeps the UI instant."""
        for line in self:
            line.montant_ligne = (line.quantity or 0.0) * (line.price_unit or 0.0)
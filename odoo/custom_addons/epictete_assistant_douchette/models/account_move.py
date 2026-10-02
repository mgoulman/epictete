from odoo import _, models


class AccountMove(models.Model):
    _inherit = 'account.move'

    def action_open_scan_wizard(self):
        """Open the Assistant douchette wizard scoped to this draft vendor bill."""
        self.ensure_one()
        if self.move_type != 'in_invoice':
            return False
        wizard = self.env['account.invoice.scan.wizard'].with_context(
            default_move_id=self.id,
        ).create({'move_id': self.id})
        return {
            'type': 'ir.actions.act_window',
            'name': _('Assistant douchette'),
            'res_model': 'account.invoice.scan.wizard',
            'res_id': wizard.id,
            'view_mode': 'form',
            'target': 'new',
        }
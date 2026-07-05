-- Remove empty UNPAID drafts created by repeated payment API calls during testing
DELETE FROM paleo_membership_payment
WHERE payment_status = 'UNPAID'
  AND (voucher_url IS NULL OR voucher_url = '');

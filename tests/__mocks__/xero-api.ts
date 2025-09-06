// Mock data for Xero API responses

export const mockXeroTenant = {
  tenantId: 'test-tenant-id',
  tenantName: 'Test Company',
  tenantType: 'ORGANISATION',
}

export const mockXeroTenants = [mockXeroTenant]

export const mockXeroTokenResponse = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 1800,
  token_type: 'Bearer',
  scope: 'openid profile email accounting.transactions',
}

export const mockXeroAccount = {
  AccountID: 'test-account-id',
  Code: '100',
  Name: 'Test Account',
  Type: 'REVENUE',
  Status: 'ACTIVE',
  Description: 'Test revenue account',
}

export const mockXeroAccounts = {
  Accounts: [mockXeroAccount],
}

export const mockXeroContact = {
  ContactID: 'test-contact-id',
  Name: 'Test Customer',
  EmailAddress: 'test@example.com',
  ContactStatus: 'ACTIVE',
  IsCustomer: true,
  IsSupplier: false,
}

export const mockXeroContacts = {
  Contacts: [mockXeroContact],
}

export const mockXeroInvoice = {
  InvoiceID: 'test-invoice-id',
  Type: 'ACCREC',
  Contact: mockXeroContact,
  Date: '2024-01-01',
  DueDate: '2024-01-31',
  Status: 'AUTHORISED',
  LineAmountTypes: 'Exclusive',
  LineItems: [
    {
      Description: 'Test Item',
      Quantity: 1,
      UnitAmount: 100.0,
      AccountCode: '100',
      TaxType: 'NONE',
    },
  ],
  Total: 100.0,
}

export const mockXeroInvoices = {
  Invoices: [mockXeroInvoice],
}

export const mockXeroPayment = {
  PaymentID: 'test-payment-id',
  Date: '2024-01-01',
  Amount: 100.0,
  Reference: 'Test Payment',
  Status: 'AUTHORISED',
}

export const mockXeroPayments = {
  Payments: [mockXeroPayment],
}

export const mockXeroBankTransaction = {
  BankTransactionID: 'test-transaction-id',
  Type: 'SPEND',
  Reference: 'Test Transaction',
  Amount: -50.0,
  Date: '2024-01-01',
  Status: 'AUTHORISED',
}

export const mockXeroBankTransactions = {
  BankTransactions: [mockXeroBankTransaction],
}

// Mock Xero API error responses
export const mockXeroApiError = {
  response: {
    status: 401,
    data: {
      Type: 'Unauthorized',
      Title: 'Unauthorized',
      Detail: 'AuthenticationUnsuccessful',
    },
  },
}

export const mockXeroRateLimitError = {
  response: {
    status: 429,
    data: {
      Type: 'RateLimitError',
      Title: 'Rate limit exceeded',
      Detail: 'Too many requests',
    },
  },
}
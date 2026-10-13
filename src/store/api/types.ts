/**
 * Response contracts for MobileApiJson.ashx.
 *
 * Every action responds with HTTP 200 and an envelope: `{ Success, Message, Data }`.
 * Failures are signalled by `Success: false` (e.g. "Customer not found."), not by status code.
 *
 * Shapes marked "verified" were captured from the live API. The rest were not observable without
 * an authenticated customer, so they are typed loosely and read through `pickString`/`pickNumber`.
 */

export interface ApiEnvelope<T> {
  Success: boolean;
  Message: string | null;
  Data: T;
}

export type ApiRecord = Record<string, unknown>;

/** Verified. */
export interface Category {
  CategoryId: string;
  CategoryName: string;
}

/** Verified. Numeric fields arrive as strings; dates as dd/MM/yyyy. */
export interface Product {
  ProductId: string;
  ProductName: string;
  Security: string;
  ISINNumber: string;
  CategoryId: string;
  CategoryName: string;
  PaymentType: string;
  FaceValue: string;
  CouponRate: string;
  YTM: string;
  Price: string;
  MaturityDate: string;
  IPDate: string;
  Quantity: string;
  StockStatus: string | null;
  CreditRating: string | null;
  ImageUrl: string | null;
  DetailsUrl: string | null;
}

/** Verified. */
export interface ProductPage {
  PageIndex: number;
  PageSize: number;
  TotalRecords: number;
  Products: Product[];
}

export interface Faq {
  Question?: string;
  Answer?: string;
  [key: string]: unknown;
}

/** Verified. */
export interface ProductDetail {
  Product: Product;
  Description: string | null;
  GuaranteedBy: string | null;
  PutCallDate: string | null;
  CallDate: string | null;
  DataStatus: string | null;
  MemorandumFile: string | null;
  ProductFile: string | null;
  MaturityType: string | null;
  FAQs: Faq[];
}

/** Verified. Each document status is null until submitted. */
export interface KycStatus {
  PanStatus: string | null;
  AdharStatus: string | null;
  DemateStatus: string | null;
  BankStatus: string | null;
  OverallStatus: string | null;
  PanNumber: string | null;
  AdharNumber: string | null;
  DemateAccountNumber: string | null;
  ClientId: string | null;
  CmlFilePath: string | null;
  BankAccountNumber: string | null;
  BankHolderName: string | null;
  BankName: string | null;
  IFSCCode: string | null;
  BankDocPath: string | null;
}

/** Verified (entry item shape not yet observed). */
export interface KycDetails {
  Status: KycStatus;
  PanEntries: ApiRecord[];
  AdharEntries: ApiRecord[];
  DematEntries: ApiRecord[];
  BankEntries: ApiRecord[];
}

/** Verified. */
export interface InvestmentPreview {
  Product: Product;
  LastInterestDate: string | null;
  IsEomProduct: boolean;
  CanInvestNow: boolean;
  Kyc: KycStatus | null;
}

/** Verified (item shape not yet observed). */
export interface CashFlowList {
  Latest: ApiRecord | null;
  Items: ApiRecord[];
}

/** Verified (item shape not yet observed). */
export interface DealList {
  Items: ApiRecord[];
}

/** Verified. */
export interface PortfolioSummary {
  Holdings: number;
  TotalDeals: number;
  TotalInvested: number;
  TotalFaceValue: number;
  EstimatedAnnualInterest: number;
  AverageCoupon: number;
}

/** Verified (holding item shape not yet observed). */
export interface Portfolio {
  Summary: PortfolioSummary;
  Holdings: ApiRecord[];
}

// ---- Request payloads (as documented by the backend) ----

export interface SignupRequest {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  /** dd/MM/yyyy */
  dateOfBirth: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface ProductsRequest {
  pageIndex: number;
  pageSize: number;
  categoryId?: string;
  searchText?: string;
}

export interface SubmitKycRequest {
  customerId: string;
  panNumber: string;
  panDescription: string;
  adharNumber: string;
  adharDescription: string;
  dematAccountNumber: string;
  clientId: string;
  dematDescription: string;
  cmlFileBase64: string;
  cmlFileName: string;
}

export interface SubmitBankRequest {
  customerId: string;
  bankAccountNumber: string;
  bankHolderName: string;
  bankName: string;
  ifscCode: string;
  bankDocBase64: string;
  bankDocFileName: string;
}

export interface CashFlowScheduleRow {
  monthDayValue: string;
  /** dd/MM/yyyy */
  interestDate: string;
  interestValue: string;
}

/** Field names (incl. "sattlementDate") match the backend contract exactly. */
export interface SaveCashFlowRequest {
  customerId: string;
  productId: string;
  paymentType: string;
  sattlementDate: string;
  lastIpDate: string;
  faceValueForDeal: string;
  totalConsiderationAmount: string;
  quantity: string;
  principalAmount: string;
  totalAssuredInterest: string;
  grossConsideration: string;
  priceRate: string;
  schedule: CashFlowScheduleRow[];
}

/** Field names (incl. "sattlementDate", "accuredInterest") match the backend contract exactly. */
export interface CreateDealRequest {
  customerId: string;
  productId: string;
  rate: string;
  dealDate: string;
  sattlementDate: string;
  noOfDays: string;
  quantity: string;
  principalAmount: string;
  accuredInterest: string;
  stampDuty: string;
  considerationStamp: string;
  dealValue: string;
  lastIpDate: string;
  grossConsideration: string;
}

export interface CreatePaymentRequestRequest {
  dealConfirmationId: string;
  customerId: string;
}

export interface CreatePaymentOrderRequest {
  dealId: string;
  qty: string;
  amount: string;
  customerName: string;
  email: string;
  mobile: string;
}

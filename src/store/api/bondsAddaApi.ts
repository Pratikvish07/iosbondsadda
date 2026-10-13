import { createApi } from '@reduxjs/toolkit/query/react';

import { sessionFromAuthPayload, type Session } from '@/lib/secureSession';
import { startSession } from '@/store/slices/authSlice';

import { apiBaseQuery, type ApiMeta } from './baseQuery';
import type {
  ApiRecord,
  CashFlowList,
  Category,
  CreateDealRequest,
  CreatePaymentOrderRequest,
  CreatePaymentRequestRequest,
  DealList,
  InvestmentPreview,
  KycDetails,
  KycStatus,
  LoginRequest,
  Portfolio,
  ProductDetail,
  ProductPage,
  ProductsRequest,
  SaveCashFlowRequest,
  SignupRequest,
  SubmitBankRequest,
  SubmitKycRequest,
} from './types';

/** Result of a write action: the server's confirmation message plus whatever `Data` it returned. */
export interface MutationResult<T = unknown> {
  message: string | null;
  data: T;
}

const withMessage = <T>(data: T, meta: ApiMeta | undefined): MutationResult<T> => ({
  message: meta?.message ?? null,
  data,
});

type CustomerArg = { customerId: string };
type ProductArg = { productId: string };

export const bondsAddaApi = createApi({
  reducerPath: 'bondsAddaApi',
  baseQuery: apiBaseQuery,
  tagTypes: ['Profile', 'Dashboard', 'Kyc', 'CashFlow', 'Deal', 'Payment', 'Portfolio', 'Preview'],
  keepUnusedDataFor: 120,
  refetchOnReconnect: true,
  endpoints: (build) => ({
    // ---- Auth ----
    login: build.mutation<Session | null, LoginRequest>({
      query: (body) => ({ action: 'login', method: 'POST', body }),
      transformResponse: (data: unknown, _meta, arg) => sessionFromAuthPayload(data, arg.userName),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data: session } = await queryFulfilled;
          if (session) await dispatch(startSession(session)).unwrap();
        } catch {
          // The calling screen renders the error from the mutation result.
        }
      },
    }),
    signup: build.mutation<MutationResult<Session | null>, SignupRequest>({
      query: (body) => ({ action: 'signup', method: 'POST', body }),
      transformResponse: (data: unknown, meta, arg) =>
        withMessage(sessionFromAuthPayload(data, arg.email), meta),
    }),

    // ---- Catalogue (public) ----
    categories: build.query<Category[], void>({
      query: () => ({ action: 'categories' }),
      transformResponse: (data: Category[] | null) =>
        (data ?? []).map((c) => ({ ...c, CategoryName: c.CategoryName.trim() })),
      keepUnusedDataFor: 3600,
    }),
    products: build.query<ProductPage, ProductsRequest>({
      query: ({ pageIndex, pageSize, categoryId, searchText }) => ({
        action: 'products',
        params: { pageIndex, pageSize, categoryId, searchText: searchText?.trim() },
      }),
      transformResponse: (data: ProductPage | null, _meta, arg) =>
        data ?? { PageIndex: arg.pageIndex, PageSize: arg.pageSize, TotalRecords: 0, Products: [] },
      // One cache entry per filter; pages are appended so FlatList can paginate.
      serializeQueryArgs: ({ queryArgs }) => ({
        categoryId: queryArgs.categoryId ?? '',
        searchText: queryArgs.searchText?.trim() ?? '',
        pageSize: queryArgs.pageSize,
      }),
      merge: (current, incoming, { arg }) => {
        if (arg.pageIndex <= 1) return incoming;
        const seen = new Set(current.Products.map((p) => p.ProductId));
        current.Products.push(...incoming.Products.filter((p) => !seen.has(p.ProductId)));
        current.PageIndex = incoming.PageIndex;
        current.TotalRecords = incoming.TotalRecords;
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.pageIndex !== previousArg?.pageIndex,
    }),
    productDetail: build.query<ProductDetail, ProductArg & CustomerArg>({
      query: ({ productId, customerId }) => ({ action: 'productDetail', params: { productId, customerId } }),
    }),
    investmentPreview: build.query<InvestmentPreview, ProductArg & CustomerArg>({
      query: ({ productId, customerId }) => ({ action: 'investmentPreview', params: { productId, customerId } }),
      providesTags: (_r, _e, { productId }) => [{ type: 'Preview', id: productId }],
    }),

    // ---- Customer ----
    profile: build.query<ApiRecord, CustomerArg>({
      query: ({ customerId }) => ({ action: 'profile', params: { customerId } }),
      providesTags: ['Profile'],
    }),
    dashboard: build.query<ApiRecord, CustomerArg>({
      query: ({ customerId }) => ({ action: 'dashboard', params: { customerId } }),
      providesTags: ['Dashboard'],
    }),
    portfolio: build.query<Portfolio, CustomerArg>({
      query: ({ customerId }) => ({ action: 'portfolio', params: { customerId } }),
      providesTags: ['Portfolio'],
    }),

    // ---- KYC & bank ----
    kycStatus: build.query<KycStatus, CustomerArg>({
      query: ({ customerId }) => ({ action: 'kycStatus', params: { customerId } }),
      providesTags: ['Kyc'],
    }),
    kycDetails: build.query<KycDetails, CustomerArg>({
      query: ({ customerId }) => ({ action: 'kycDetails', params: { customerId } }),
      providesTags: ['Kyc'],
    }),
    submitKyc: build.mutation<MutationResult, SubmitKycRequest>({
      query: (body) => ({ action: 'submitKyc', method: 'POST', body }),
      transformResponse: withMessage,
      invalidatesTags: ['Kyc', 'Preview', 'Profile', 'Dashboard'],
    }),
    submitBank: build.mutation<MutationResult, SubmitBankRequest>({
      query: (body) => ({ action: 'submitBank', method: 'POST', body }),
      transformResponse: withMessage,
      invalidatesTags: ['Kyc', 'Preview', 'Profile', 'Dashboard'],
    }),

    // ---- Cash flows ----
    cashFlows: build.query<CashFlowList, CustomerArg & ProductArg>({
      query: ({ customerId, productId }) => ({ action: 'cashFlows', params: { customerId, productId } }),
      transformResponse: (data: CashFlowList | null) => data ?? { Latest: null, Items: [] },
      providesTags: (_r, _e, { productId }) => [{ type: 'CashFlow', id: productId }],
    }),
    cashFlowDetail: build.query<ApiRecord, CustomerArg & ProductArg & { cashFlowId: string }>({
      query: ({ cashFlowId, customerId, productId }) => ({
        action: 'cashFlowDetail',
        params: { cashFlowId, customerId, productId },
      }),
      providesTags: (_r, _e, { cashFlowId }) => [{ type: 'CashFlow', id: `detail-${cashFlowId}` }],
    }),
    saveCashFlow: build.mutation<MutationResult, SaveCashFlowRequest>({
      query: (body) => ({ action: 'saveCashFlow', method: 'POST', body }),
      transformResponse: withMessage,
      invalidatesTags: (_r, _e, { productId }) => [{ type: 'CashFlow', id: productId }],
    }),

    // ---- Deals ----
    deals: build.query<DealList, CustomerArg & Partial<ProductArg>>({
      query: ({ customerId, productId }) => ({ action: 'deals', params: { customerId, productId } }),
      transformResponse: (data: DealList | null) => data ?? { Items: [] },
      providesTags: [{ type: 'Deal', id: 'LIST' }],
    }),
    dealDetail: build.query<ApiRecord, CustomerArg & ProductArg & { dealConfirmationId: string }>({
      query: ({ dealConfirmationId, customerId, productId }) => ({
        action: 'dealDetail',
        params: { dealConfirmationId, customerId, productId },
      }),
      providesTags: (_r, _e, { dealConfirmationId }) => [{ type: 'Deal', id: dealConfirmationId }],
    }),
    createDeal: build.mutation<MutationResult<ApiRecord | null>, CreateDealRequest>({
      query: (body) => ({ action: 'createDeal', method: 'POST', body }),
      transformResponse: (data: ApiRecord | null, meta) => withMessage(data, meta),
      invalidatesTags: [{ type: 'Deal', id: 'LIST' }, 'Portfolio', 'Dashboard'],
    }),

    // ---- Payments ----
    payments: build.query<ApiRecord[], CustomerArg>({
      query: ({ customerId }) => ({ action: 'payments', params: { customerId } }),
      transformResponse: (data: unknown) => {
        if (Array.isArray(data)) return data as ApiRecord[];
        const items = (data as { Items?: unknown } | null)?.Items;
        return Array.isArray(items) ? (items as ApiRecord[]) : [];
      },
      providesTags: [{ type: 'Payment', id: 'LIST' }],
    }),
    paymentStatus: build.query<ApiRecord, { dealId: string }>({
      query: ({ dealId }) => ({ action: 'paymentStatus', params: { dealId } }),
      providesTags: (_r, _e, { dealId }) => [{ type: 'Payment', id: dealId }],
    }),
    createPaymentRequest: build.mutation<MutationResult<ApiRecord | null>, CreatePaymentRequestRequest>({
      query: (body) => ({ action: 'createPaymentRequest', method: 'POST', body }),
      transformResponse: (data: ApiRecord | null, meta) => withMessage(data, meta),
      invalidatesTags: (_r, _e, { dealConfirmationId }) => [
        { type: 'Payment', id: 'LIST' },
        { type: 'Payment', id: dealConfirmationId },
        { type: 'Deal', id: dealConfirmationId },
      ],
    }),
    createPaymentOrder: build.mutation<MutationResult<ApiRecord | null>, CreatePaymentOrderRequest>({
      query: (body) => ({ action: 'createPaymentOrder', method: 'POST', body }),
      transformResponse: (data: ApiRecord | null, meta) => withMessage(data, meta),
      invalidatesTags: (_r, _e, { dealId }) => [
        { type: 'Payment', id: 'LIST' },
        { type: 'Payment', id: dealId },
        { type: 'Deal', id: dealId },
        { type: 'Deal', id: 'LIST' },
        'Portfolio',
        'Dashboard',
      ],
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useCategoriesQuery,
  useProductsQuery,
  useProductDetailQuery,
  useInvestmentPreviewQuery,
  useProfileQuery,
  useDashboardQuery,
  usePortfolioQuery,
  useKycStatusQuery,
  useKycDetailsQuery,
  useSubmitKycMutation,
  useSubmitBankMutation,
  useCashFlowsQuery,
  useCashFlowDetailQuery,
  useSaveCashFlowMutation,
  useDealsQuery,
  useDealDetailQuery,
  useCreateDealMutation,
  usePaymentsQuery,
  usePaymentStatusQuery,
  useCreatePaymentRequestMutation,
  useCreatePaymentOrderMutation,
} = bondsAddaApi;

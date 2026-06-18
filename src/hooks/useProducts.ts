import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"

export interface Product {
  product_id: string
  name: string
  amount: number
  credits: number
  currency: string
}

export interface Order {
  id: string
  customer_name: string
  customer_mobile: string
  customer_email?: string
  customer_state?: string
  product_id: string
  amount: number
  credits: number
  credits_raw?: number
  credits_unit?: string
  razorpay_order_id?: string
  razorpay_payment_id?: string
  status: string
  created_at: string
  updated_at: string
  currency: string
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Product[] }>("/api/v1/pricing/plans")
      return res.data.data || []
    },
  })
}

const MOCK_QC_ORDERS = [
	{
		"id" : "24057794-415d-43df-8069-154e7b6fd247",
		"customer_name" : "Karan Kacha new plugin test",
		"customer_mobile" : "9157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Jharkhand",
		"product_id" : "a",
		"amount" : 349.00,
		"razorpay_order_id" : "order_Sran7sROrDm9UE",
		"razorpay_payment_id" : "pay_SranGEjMr76ycO",
		"status" : "PAID",
		"credits_minutes" : 60.00,
		"created_at" : "2026-05-20T10:53:31.422Z",
		"updated_at" : "2026-05-20T10:53:55.401Z",
		"currency" : "INR",
        "api_key" : "qc_demo_1234567890abcdef"
	},
	{
		"id" : "d601cb59-8df1-4075-9d7d-f69a2f79332e",
		"customer_name" : "Guest",
		"customer_mobile" : "+919157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Jharkhand",
		"product_id" : "a",
		"amount" : 349.00,
		"razorpay_order_id" : "order_Sraup86vULEUTt",
		"razorpay_payment_id" : "pay_SrauuSHpgGKGw2",
		"status" : "PAID",
		"credits_minutes" : 60.00,
		"created_at" : "2026-05-20T11:00:48.643Z",
		"updated_at" : "2026-05-20T11:35:50.084Z",
		"currency" : "INR",
        "api_key" : "qc_guest_0987654321fedcba"
	},
	{
		"id" : "01033fdf-d0fd-4c0c-8a21-52ecf1b21852",
		"customer_name" : "Karan Kacha",
		"customer_mobile" : "9157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Gujarat",
		"product_id" : "a",
		"amount" : 349.00,
		"razorpay_order_id" : "order_Srbej9f54tHFxZ",
		"razorpay_payment_id" : "pay_SrbepevpdKqHlY",
		"status" : "PAID",
		"credits_minutes" : 60.00,
		"created_at" : "2026-05-20T11:44:15.960Z",
		"updated_at" : "2026-05-20T11:44:37.807Z",
		"currency" : "INR"
	},
	{
		"id" : "7dd4a3b4-8fc7-4ca8-bdbf-4a11c5121c9e",
		"customer_name" : "Guest",
		"customer_mobile" : "9157587671",
		"customer_email" : "void@razorpay.com",
		"customer_state" : "Gujarat",
		"product_id" : "a",
		"amount" : 349.00,
		"razorpay_order_id" : "order_SrcDKPrTZXZCV6",
		"razorpay_payment_id" : "pay_SrcDNkJmr1rJ6q",
		"status" : "PAID",
		"credits_minutes" : 60.00,
		"created_at" : "2026-05-20T12:17:01.291Z",
		"updated_at" : "2026-05-20T12:17:21.148Z",
		"currency" : "INR"
	},
	{
		"id" : "ebc99761-3a40-4313-bb4a-8aa19ddca16e",
		"customer_name" : "Karan Kacha",
		"customer_mobile" : "9898989898",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Gujarat",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_SsIYYpJDpzxOQS",
		"razorpay_payment_id" : "pay_SsIYdDCh3FqGh7",
		"status" : "PAID",
		"credits_minutes" : 180.00,
		"created_at" : "2026-05-22T05:42:19.909Z",
		"updated_at" : "2026-05-22T05:42:44.212Z",
		"currency" : "INR"
	},
	{
		"id" : "c35f2573-a891-477c-ba60-1c40d5e4feee",
		"customer_name" : "Guest",
		"customer_mobile" : "9898999898",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Haryana",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_SsJFr1Q3tdzVsn",
		"razorpay_payment_id" : "pay_SsJFyEJUIPRuh1",
		"status" : "PAID",
		"credits_minutes" : 180.00,
		"created_at" : "2026-05-22T06:23:18.982Z",
		"updated_at" : "2026-05-22T06:23:43.056Z",
		"currency" : "INR"
	},
	{
		"id" : "127a4cfa-5d19-4276-b44d-acc10683a6a5",
		"customer_name" : "Guest",
		"customer_mobile" : "9157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Assam",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_SsJS9voKTIOHex",
		"razorpay_payment_id" : "pay_SsJSEKe3TOECzQ",
		"status" : "PAID",
		"credits_minutes" : 180.00,
		"created_at" : "2026-05-22T06:34:57.929Z",
		"updated_at" : "2026-05-22T06:35:23.846Z",
		"currency" : "INR"
	},
	{
		"id" : "ec2d41aa-6047-4be9-b977-3ee86c27fd34",
		"customer_name" : "Guest",
		"customer_mobile" : "0000000000",
		"customer_email" : null,
		"customer_state" : "Unknown",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_SsJtV9VIuS7Rpx",
		"razorpay_payment_id" : null,
		"status" : "PENDING",
		"credits_minutes" : 180.00,
		"created_at" : "2026-05-22T07:00:50.933Z",
		"updated_at" : "2026-05-22T07:00:50.933Z",
		"currency" : "INR"
	},
	{
		"id" : "c006991d-4440-479d-a091-08864c341c4f",
		"customer_name" : "Karan Kacha",
		"customer_mobile" : "9898989898",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Gujarat",
		"product_id" : "a",
		"amount" : 349.00,
		"razorpay_order_id" : "order_SsJtgwX0GU4M36",
		"razorpay_payment_id" : "pay_SsJtkhJz9XDOwf",
		"status" : "PAID",
		"credits_minutes" : 60.00,
		"created_at" : "2026-05-22T07:01:01.731Z",
		"updated_at" : "2026-05-22T07:01:22.179Z",
		"currency" : "INR"
	},
	{
		"id" : "49209c18-05e3-47bb-aaa9-ee0c8713a7d1",
		"customer_name" : "Guest",
		"customer_mobile" : "+919157587671",
		"customer_email" : "void@razorpay.com",
		"customer_state" : "Unknown",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_SsLA7yE9y7XVPi",
		"razorpay_payment_id" : "pay_SsLAG74YYxShtt",
		"status" : "PAID",
		"credits_minutes" : 180.00,
		"created_at" : "2026-05-22T08:15:16.897Z",
		"updated_at" : "2026-05-22T08:15:41.145Z",
		"currency" : "INR"
	},
	{
		"id" : "9dbe4bcc-f91c-4cb4-bb2e-a30a9daea4fd",
		"customer_name" : "Guest",
		"customer_mobile" : "+919898989898",
		"customer_email" : "void@razorpay.com",
		"customer_state" : "Unknown",
		"product_id" : "a",
		"amount" : 349.00,
		"razorpay_order_id" : "order_SsLB0dNuQXyUwA",
		"razorpay_payment_id" : "pay_SsLBBQATUF9qVr",
		"status" : "PAID",
		"credits_minutes" : 60.00,
		"created_at" : "2026-05-22T08:16:06.972Z",
		"updated_at" : "2026-05-22T08:16:33.492Z",
		"currency" : "INR"
	},
	{
		"id" : "c42bc452-ba3b-49be-b436-b1ff537f4e8f",
		"customer_name" : "Karan Kacha",
		"customer_mobile" : "0000000000",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Gujarat",
		"product_id" : "c",
		"amount" : 9.00,
		"razorpay_order_id" : "order_SuIvkIMi6ryYXH",
		"razorpay_payment_id" : null,
		"status" : "PENDING",
		"credits_minutes" : 180.00,
		"created_at" : "2026-05-27T07:22:09.182Z",
		"updated_at" : "2026-05-27T07:22:09.182Z",
		"currency" : "USD"
	},
	{
		"id" : "a3c09b05-5e05-4f88-82fe-fae49004d71c",
		"customer_name" : "Guest",
		"customer_mobile" : "0000000000",
		"customer_email" : null,
		"customer_state" : "Unknown",
		"product_id" : "c",
		"amount" : 9.00,
		"razorpay_order_id" : "order_SuIz45RvxFqxko",
		"razorpay_payment_id" : null,
		"status" : "PENDING",
		"credits_minutes" : 180.00,
		"created_at" : "2026-05-27T07:25:17.661Z",
		"updated_at" : "2026-05-27T07:25:17.661Z",
		"currency" : "USD"
	},
	{
		"id" : "60cd2475-7ec0-46cb-a1c4-a044c4380f87",
		"customer_name" : "Guest",
		"customer_mobile" : "0000000000",
		"customer_email" : null,
		"customer_state" : "Unknown",
		"product_id" : "a",
		"amount" : 349.00,
		"razorpay_order_id" : "order_SuIzMf8xm8kRwL",
		"razorpay_payment_id" : null,
		"status" : "PENDING",
		"credits_minutes" : 60.00,
		"created_at" : "2026-05-27T07:25:34.691Z",
		"updated_at" : "2026-05-27T07:25:34.691Z",
		"currency" : "INR"
	},
	{
		"id" : "f8708328-cc80-4f49-9de5-0b81cdd0a780",
		"customer_name" : "Karan Kacha",
		"customer_mobile" : "9157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Haryana",
		"product_id" : "c",
		"amount" : 9.00,
		"razorpay_order_id" : "order_SuLj4Vl0cNV31D",
		"razorpay_payment_id" : "pay_SuLjXSJFtCAAPP",
		"status" : "PAID",
		"credits_minutes" : 180.00,
		"created_at" : "2026-05-27T10:06:14.035Z",
		"updated_at" : "2026-05-27T10:11:20.655Z",
		"currency" : "USD"
	},
	{
		"id" : "f257cdfc-792d-4a56-944b-d49aa393ff43",
		"customer_name" : "Guest",
		"customer_mobile" : "0000000000",
		"customer_email" : null,
		"customer_state" : "Unknown",
		"product_id" : "d",
		"amount" : 19.00,
		"razorpay_order_id" : "order_SuLoz6acoNw0yN",
		"razorpay_payment_id" : null,
		"status" : "PENDING",
		"credits_minutes" : 360.00,
		"created_at" : "2026-05-27T10:11:49.904Z",
		"updated_at" : "2026-05-27T10:11:49.904Z",
		"currency" : "USD"
	},
	{
		"id" : "0785163e-7d7e-4436-8337-0358da0b1b4b",
		"customer_name" : "Guest",
		"customer_mobile" : "+919157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Unknown",
		"product_id" : "d",
		"amount" : 1299.00,
		"razorpay_order_id" : "order_SuMijC679J6s5n",
		"razorpay_payment_id" : "pay_SuMioObRH7IDrV",
		"status" : "PAID",
		"credits_minutes" : 360.00,
		"created_at" : "2026-05-27T11:04:36.109Z",
		"updated_at" : "2026-05-27T11:04:57.535Z",
		"currency" : "INR"
	},
	{
		"id" : "b763f379-0a39-4fe5-8c36-e9f2d9f5c910",
		"customer_name" : "Guest",
		"customer_mobile" : "0000000000",
		"customer_email" : null,
		"customer_state" : "Unknown",
		"product_id" : "d",
		"amount" : 19.00,
		"razorpay_order_id" : "order_SuhkWYcigOmPbO",
		"razorpay_payment_id" : null,
		"status" : "PENDING",
		"credits_minutes" : 360.00,
		"created_at" : "2026-05-28T07:38:48.787Z",
		"updated_at" : "2026-05-28T07:38:48.787Z",
		"currency" : "USD"
	},
	{
		"id" : "facaa9c6-4704-45fb-98f4-4d1921577bc1",
		"customer_name" : "Karan Kacha",
		"customer_mobile" : "9157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Ladakh",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_SuhlHm85h3hzk7",
		"razorpay_payment_id" : "pay_SuhlY0tlmbLvdr",
		"status" : "PAID",
		"credits_minutes" : 180.00,
		"created_at" : "2026-05-28T07:39:32.025Z",
		"updated_at" : "2026-05-28T07:40:06.155Z",
		"currency" : "INR"
	},
	{
		"id" : "85308bac-6b88-4e3f-866d-d16e5f8c0216",
		"customer_name" : "Guest",
		"customer_mobile" : "+919157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Unknown",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_Sv3txiIvT3gHg2",
		"razorpay_payment_id" : "pay_Sv3uVklpiY1d1F",
		"status" : "PAID",
		"credits_minutes" : 180.00,
		"created_at" : "2026-05-29T05:18:57.374Z",
		"updated_at" : "2026-05-29T05:19:47.427Z",
		"currency" : "INR"
	},
	{
		"id" : "32a5bf91-23b5-4d59-8146-914badb013c5",
		"customer_name" : "Karan Kacha",
		"customer_mobile" : "9157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Ladakh",
		"product_id" : "d",
		"amount" : 1299.00,
		"razorpay_order_id" : "order_Sv3wupVjG6uLlo",
		"razorpay_payment_id" : "pay_Sv3xBlrfRts7Ch",
		"status" : "PAID",
		"credits_minutes" : 360.00,
		"created_at" : "2026-05-29T05:21:45.127Z",
		"updated_at" : "2026-05-29T05:22:21.269Z",
		"currency" : "INR"
	},
	{
		"id" : "66c8b7f3-6561-4fdf-8488-406d62f36f82",
		"customer_name" : "Karan Kacha",
		"customer_mobile" : "9157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Lakshadweep",
		"product_id" : "d",
		"amount" : 19.00,
		"razorpay_order_id" : "order_Sv7m0otrGx7ZGP",
		"razorpay_payment_id" : "pay_Sv7mEkbPukSToB",
		"status" : "PAID",
		"credits_minutes" : 360.00,
		"created_at" : "2026-05-29T09:06:12.205Z",
		"updated_at" : "2026-05-29T09:06:43.674Z",
		"currency" : "USD"
	},
	{
		"id" : "4c6a6aee-b00a-46ab-9791-b0d352eab84a",
		"customer_name" : "Guest",
		"customer_mobile" : "+919157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Unknown",
		"product_id" : "d",
		"amount" : 19.00,
		"razorpay_order_id" : "order_Sv7mxrChYkIe0A",
		"razorpay_payment_id" : "pay_Sv7nAwHvfRW573",
		"status" : "PAID",
		"credits_minutes" : 360.00,
		"created_at" : "2026-05-29T09:07:06.300Z",
		"updated_at" : "2026-05-29T09:07:37.629Z",
		"currency" : "USD"
	},
	{
		"id" : "02f9c158-557b-4f4a-8683-04f4c8e1672a",
		"customer_name" : "Guest",
		"customer_mobile" : "0000000000",
		"customer_email" : null,
		"customer_state" : "Unknown",
		"product_id" : "a",
		"amount" : 349.00,
		"razorpay_order_id" : "order_SvATphPSFNCjar",
		"razorpay_payment_id" : null,
		"status" : "PENDING",
		"credits_minutes" : 60.00,
		"created_at" : "2026-05-29T11:45:04.402Z",
		"updated_at" : "2026-05-29T11:45:04.402Z",
		"currency" : "INR"
	},
	{
		"id" : "73e590b6-770f-430d-b1b0-89a18b5a6d84",
		"customer_name" : "Guest",
		"customer_mobile" : "+919157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Unknown",
		"product_id" : "a",
		"amount" : 349.00,
		"razorpay_order_id" : "order_SzRBL9TVaEVJR3",
		"razorpay_payment_id" : "pay_SzRCdcB7sbegAj",
		"status" : "PAID",
		"credits_minutes" : 60.00,
		"created_at" : "2026-06-09T06:41:19.943Z",
		"updated_at" : "2026-06-09T06:42:58.226Z",
		"currency" : "INR"
	},
	{
		"id" : "45add36d-f39f-498e-8e34-805da7d9b80e",
		"customer_name" : "Guest",
		"customer_mobile" : "9157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Kerala",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_SzRt8oDgZZDNLa",
		"razorpay_payment_id" : "pay_SzRtLOIpw5hEZI",
		"status" : "PAID",
		"credits_minutes" : 180.00,
		"created_at" : "2026-06-09T07:22:47.828Z",
		"updated_at" : "2026-06-09T07:23:17.705Z",
		"currency" : "INR"
	},
	{
		"id" : "8188dbb3-aaff-4800-9818-288c5a29d022",
		"customer_name" : "Guest",
		"customer_mobile" : "+919157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Unknown",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_T1nBBY3Rb6HT1d",
		"razorpay_payment_id" : "pay_T1nBMDZ3snBcQr",
		"status" : "PAID",
		"credits_minutes" : 180.00,
		"created_at" : "2026-06-15T05:30:08.557Z",
		"updated_at" : "2026-06-15T05:30:41.271Z",
		"currency" : "INR"
	},
	{
		"id" : "018049e2-631a-4d74-a47b-5501fea00769",
		"customer_name" : "Guest",
		"customer_mobile" : "+919157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Unknown",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_T1nIVEaacekmnP",
		"razorpay_payment_id" : "pay_T1nIjL9XtLZ4u7",
		"status" : "PAID",
		"credits_minutes" : 180.00,
		"created_at" : "2026-06-15T05:37:04.220Z",
		"updated_at" : "2026-06-15T05:37:56.449Z",
		"currency" : "INR"
	},
	{
		"id" : "b05b56f1-e742-457d-a700-2ea7afa0ac70",
		"customer_name" : "Guest",
		"customer_mobile" : "0000000000",
		"customer_email" : null,
		"customer_state" : "Unknown",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_T1nJip9UduzzPs",
		"razorpay_payment_id" : null,
		"status" : "PENDING",
		"credits_minutes" : 180.00,
		"created_at" : "2026-06-15T05:38:13.445Z",
		"updated_at" : "2026-06-15T05:38:13.445Z",
		"currency" : "INR"
	},
	{
		"id" : "18b503bb-e402-4e37-9ccc-1fb6dbc0c9ef",
		"customer_name" : "Guest",
		"customer_mobile" : "+919157587671",
		"customer_email" : "karan.kacha@qwintsoft.com",
		"customer_state" : "Unknown",
		"product_id" : "c",
		"amount" : 699.00,
		"razorpay_order_id" : "order_T1nLmyZMgiclC5",
		"razorpay_payment_id" : "pay_T1nLx4upIbm3Bs",
		"status" : "PAID",
		"credits_minutes" : 180.00,
		"created_at" : "2026-06-15T05:40:10.852Z",
		"updated_at" : "2026-06-15T05:40:38.663Z",
		"currency" : "INR"
	}
]

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Order[] }>("/api/v1/admin/orders")
      return res.data.data || []
    },
  })
}

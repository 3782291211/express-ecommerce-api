import { Prisma } from '@prisma/client'

// Prisma client query payloads
type CartItemsPayload = Prisma.CustomerGetPayload<{
  select: {
    id: true,
    name: true, username: true,
    cartItems: {
      select: {
        quantity: true,
        product: {}
      }
    }
  }
}>;

export {}

declare global {
  namespace Express {
    export interface Request {
      cartItems: CartItemsPayload,
      customerDetails: Prisma.CustomerGetPayload<{}>,
      productDetails: Prisma.ProductGetPayload<{}>,
      reviewDetails: Prisma.ReviewGetPayload<{}>
    }
  }

  type StrOrNum = string | number;

  // Global custom types - used to type variables in controllers
  type User = {
    id?: number,
    name: string,
    username: string,
    password: string,
    email: string,
    joinDate?: Date | string
  }

  type Customer = User & {
    billingAddress?: string,
    shippingAddress?: string,
    avatar?: string
  }

  type ProductCount = {
    _count?: {
      products: number
    },
    products?: number
  }

  type ProductExtended = {
    numOfTimesOrdered: number,
    totalUnitsOrdered: number,
    averageRating: string
  }

  type Product = {
    id?: number,
    name: string,
    description: string,
    price: number,
    stock: number,
    categoryName: string,
    supplierName: string,
    thumbnail?: string
  }

  type Category = ProductCount & {
    name: string,
    description: string,
    thumbnail?: string
  }
  
  type Supplier = ProductCount & {
    name: string,
    location: string,
    establishYear: number,
    thumbnail?: string
  }
  
  type CartItem = {
    customerId: number,
    productId: number,
    quantity: number
  }
  
  type OrderItem = {
    orderId: number,
    productId: number,
    quantity: number
  }
  
  type Order = {
    customerId: number,
    shippingAddress?: string,
    status?: string
  }

  type Review = {
    customerId: number,
    productId: number,
    title: string,
    body: string,
    rating: number,
    recommend?: boolean,
    createdAt?: Date
  }

  type ProductQueryParam = { 
    contains: string, 
    mode: 'insensitive' 
  }

  type ProductsUrlParams = {
    limit: StrOrNum,
    page: StrOrNum,
    minPrice: StrOrNum,
    maxPrice: StrOrNum,
    category: string,
    supplier: string,
    hideOutOfStock: boolean,
    sortBy: string,
    order: string
  }

  type MiddlewareError = Error & {
    code?: string,
    status?: number
  }

  type ModelObject = 
    Prisma.CustomerGetPayload<{}> | 
    Prisma.ProductGetPayload<{}> | 
    Prisma.ReviewGetPayload<{}>;

  // The next two types are used for the query builder payloads in product.controllers.ts
  type NumberOfOrders = {
    include?: {
      _count: {
        select: { orderItems: true }
      }
    }
  }
   
  type ProductWithOrderCount = Prisma.ProductGetPayload<NumberOfOrders> & { 
    numOfTimesOrdered?: number, 
    _count?: { 
      orderItems: number 
    } 
  }

  // The next two types are used for the query builder payloads in categories.controllers.ts
  type QueryOptions = {
    include: {
      _count?: {
        select: { products: true }
      }
    }
  };

  type CategoriesOrSuppliers = {
    categories: Category[]
  } | {
    suppliers: Supplier[]
  };

  // Types for API JSON responses - used to type variables in testing suite
  type ProductsResponse = {
    products: Product[],
    page: number,
    count: number,
    totalResults: number
  }
  
  type OrdersResponse = {
    id: number,
    name: string,
    username: string,
    orders: {
        id: number,
        customerId: number,
        shippingAddress: string | null,
        status: string,
        created_at: string,
        orderItems: {
            quantity: number,
            product: Product
        }[]
    }[]
  }

  type NewOrderResponse = {
    id: number,
    customerId: number,
    shippingAddress: string | null,
    status: string,
    created_at: string,
    orderItems: {
        quantity: number,
        product: Product
    }[]
  }

  type CartItemsResponse = {
    id: number,
    name: string,
    username: string,
    cartItems: {
      quantity: number,
      product: Product
    }[]
  }

  type BestSellers = { 
    body: { 
      bestSellers: (Product & ProductExtended)[] 
    } 
  }

  type ReviewsResponse = {
    page: number,
    count: number,
    totalResults: number,
    reviews: (Review & { id: number, createdAt: string })[]
  }
}
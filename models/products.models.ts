import prisma from "../prisma/prisma";

const productTableColumns = [ 'id', 'name', 'description', 'price', 'stock', 'categoryName', 'supplierName', 'thumbnail' ];

export const selectProducts = async (query: ProductsUrlParams) => {
    const { 
        limit = 25, 
        page = 1,
        minPrice = 0,
        maxPrice = 1e5,
        category = '',
        supplier = '',
        hideOutOfStock = false,
        sortBy = 'id',
        order = 'asc'
      } = query;
    
    const numberOfOrders = {
      include: { _count: { select: { orderItems: true } } } 
    };

    const queryOptions = {
      where: {
        AND: [ 
          { NOT: { stock: hideOutOfStock ? 0 : -1 } },
          {
            price: { 
              gte: Number(minPrice),
              lte: Number(maxPrice)
            }
          },
          { categoryName: { contains: category, mode: 'insensitive' } as ProductQueryParam },
          { supplierName: { contains: supplier, mode: 'insensitive'  } as ProductQueryParam }
        ]
      },
      orderBy: {}
    };

    if (productTableColumns.includes(sortBy)) {
      queryOptions.orderBy = {
        [sortBy]: /(asc|desc)/i.test(order) ? order.toLowerCase() : 'asc'
      }
    }
   
    return await prisma.$transaction([
      prisma.product.count(queryOptions),
      prisma.product.findMany({
        ...queryOptions,
        ...numberOfOrders,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        })
    ]);
}

export const selectBestsellers = async (
    category: string, 
    supplier: string, 
    page: string, 
    limit: string) => {

    return await prisma.$transaction([
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::INTEGER 
        FROM (
          SELECT DISTINCT oi."productId" 
          FROM "OrderItem" oi, "Product" p, "Review" r
          WHERE p."id" = oi."productId"
          AND p."id" = r."productId"
          AND p."categoryName" ILIKE ${`%${category}%`}
          AND p."supplierName" ILIKE ${`%${supplier}%`}
        ) AS temp
      `,
      prisma.$queryRaw<(Product & ProductExtended)[]>`
        SELECT 
          p."id",
          COUNT(oi."orderId")::INTEGER AS "numOfTimesOrdered",
          SUM(oi."quantity")::INTEGER AS "totalUnitsOrdered",
          ROUND(AVG(r."rating"), 2) AS "averageRating",
          p."name",
          p."description", 
          p."price",
          p."stock", 
          p."categoryName", 
          p."supplierName", 
          p."thumbnail"
        FROM "Product" p, "OrderItem" oi, "Review" r
        WHERE p."id" = oi."productId"
        AND p."id" = r."productId"
        AND p."categoryName" ILIKE ${`%${category}%`}
        AND p."supplierName" ILIKE ${`%${supplier}%`}
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT ${Number(limit)}
        OFFSET ${(Number(page) - 1) * Number(limit)}
      `
    ]);
}

export const selectFavorites = async (page: number, limit: number, id: number) => {
  const [count, favorites] = await prisma.$transaction([
    prisma.review.count({
      where: { 
        customerId: id,
        recommend: true
      },
    }),
    prisma.customer.findUnique({
      where: { id },
      select: {
        reviews: {
          where: {
            recommend: true,
          },
          include: {
            product: {}
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: isNaN(page) || isNaN(limit) ? 0 : (page - 1) * limit,
          take: isNaN(limit) ? 25 : limit
        }
      }
    })
  ]);

  return {
    page,
    count: favorites?.reviews.length,
    totalResults: count,
    favorites: favorites?.reviews.map(({ createdAt, ...product }) => {
      return { addedAt: createdAt , ...product }
    })
  };
}

export const selectProductById = async (productId: number) => {
  return await prisma.$transaction([
    prisma.review.aggregate({
      _avg: { rating: true },
      _count: { rating: true },
      where: { productId }
    }),
    prisma.product.findUnique({
      select: { _count: { select: { orderItems: true } } },
      where: { id: productId }
    })
  ]);
}

export const checkOrderHistory = async (
  productId: number, 
  customerId: number
) => {
  const productFromQuery = await prisma.product.findUnique({ 
    where: { id: productId } 
  });

  if (!productFromQuery) {
    return { notFound: `Product with id ${productId} does not exist.`};
  }

  const ordersIds = (await prisma.order.findMany({
    where: { customerId }
  })).map(order => order.id);
  
  const orderOrNull = await prisma.order.findFirst({
    where: {
      AND: [
        { customerId },
        { orderItems: {
            some: {
              productId,
              orderId: { in: ordersIds }
            }
          }
        }
      ]
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const reviewOrNull = await prisma.review.findFirst({
    where: {
      AND: [
        { customerId },
        { productId }
      ]
    }
  });

  return {
    productId,
    lastOrdered: orderOrNull ? { 
      orderId: orderOrNull.id,
      orderDate: orderOrNull.createdAt
    } : null,
    review: reviewOrNull
  }
}
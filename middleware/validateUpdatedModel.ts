import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/prisma';
import createError from '../helpers/createError';
import formatModelData from '../helpers/formatModelData';

const validateUpdatedModel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const urlIncludesCustomer = req.originalUrl.includes('customer');
    const modelData = req.originalUrl.includes('customer') ? 'customerDetails' : 'reviewDetails';

    const updatedModelData = urlIncludesCustomer ? 
      await formatModelData<Customer>(
        'customer', req.body, req.customerDetails as Customer
      )
    : await formatModelData<Review>(
        'review', req.body, req.reviewDetails as Review
      );

    if ((updatedModelData as { error: string }).error) {
      return next(createError((updatedModelData as { error: string }).error, 400));
    }
    if (Object.keys(updatedModelData).length === 0) return next();

    const queryOptions = <T>() => ({
      where: { id : req[modelData].id },
      data: updatedModelData as T
    });

    if (urlIncludesCustomer) {
      req.customerDetails = await prisma.customer.update(queryOptions<Customer>());
    } else {
      req.reviewDetails = await prisma.review.update(queryOptions<Review>());
    }
    next();
  } catch (err) {
    next(err);
  }
}

export default validateUpdatedModel;
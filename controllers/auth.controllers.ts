import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/prisma';
import bcrypt from 'bcrypt';
import hidePassword from '../helpers/hidePassword';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    const data = (({ username, name, email }) => 
      ({ username, name, email, password: hashedPassword }))(req.body);
    await prisma.customer.create({ data });
    const newCustomer = await prisma.customer.findUnique({
      where: { username: req.body.username }
    });
    res.status(201).send({
      customer: hidePassword(newCustomer as User)
    });
  } catch (err) {
    next(err);
  }
}

export const login = (req: Request, res: Response) => {
  res.status(200).send({
    customer: hidePassword(req.user as User)
  });
}

export const logout = (req: Request, res: Response, next: NextFunction) => {
  const username = (req.user as User).username;
  req.logout((err: Error) => {
    if (err) return next(err);
    res.send({msg: username + ' is now logged out.'});
  });
}
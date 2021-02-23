import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import { privateDecrypt } from 'crypto';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customerExists = await this.customersRepository.findById(customer_id);

    if (!customerExists)
      throw new AppError('Could not find any customer with the given id');

    const existenProducts = await this.productsRepository.findAllById(products);

    if (!existenProducts.length)
      throw new AppError('Could not find any products with the given ids');

    const existenProductIds = existenProducts.map(product => product.id);

    const checkInexistenProducts = products.filter(
      product => !existenProductIds.includes(product.id),
    );

    if (checkInexistenProducts.length) {
      throw new AppError(
        `Could not find product with ids: ${checkInexistenProducts.toString()}`,
      );
    }

    const findProductWithNoQuantityAvailable = products.filter(
      product =>
        existenProducts.filter(p => p.id === product.id)[0].quantity <
        product.quantity,
    );

    if (findProductWithNoQuantityAvailable.length)
      throw new AppError(
        `The quantity ${findProductWithNoQuantityAvailable[0].quantity} is not available for ${findProductWithNoQuantityAvailable[0].id}`,
      );

    const serializeProducts = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: existenProducts.filter(p => p.id === product.id)[0].price,
    }));

    const order = await this.ordersRepository.create({
      customer: customerExists,
      products: serializeProducts,
    });

    const { order_products } = order;

    const orderedProductsQuantity = order_products.map(product => ({
      id: product.product_id,
      quantity:
        existenProducts.filter(p => p.id === product.product_id)[0].quantity -
        product.quantity,
    }));

    await this.productsRepository.updateQuantity(orderedProductsQuantity);

    return order;
  }
}

export default CreateOrderService;

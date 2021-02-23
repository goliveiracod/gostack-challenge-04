import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import Customer from '../infra/typeorm/entities/Customer';
import ICustomersRepository from '../repositories/ICustomersRepository';

interface IRequest {
  name: string;
  email: string;
}

@injectable()
class CreateCustomerService {
  constructor(
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ name, email }: IRequest): Promise<Customer> {
    if (!email || !name)
      throw new AppError('Username and email cannot be empty');

    const getCustomer = await this.customersRepository.findByEmail(email);

    if (getCustomer) throw new AppError('Customer already exists');

    const createdCustomer = await this.customersRepository.create({
      name,
      email,
    });

    return createdCustomer;
  }
}

export default CreateCustomerService;

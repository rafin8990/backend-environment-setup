import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ISupplier } from './suppliers.interface';
import { SupplierService } from './suppliers.service';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const createSupplier = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await SupplierService.createSupplier(data);
  sendResponse<ISupplier>(res, {
    statusCode: httpStatus.CREATED,
    message: 'Supplier created successfully',
    success: true,
    data: result,
  });
});

const getAllSuppliers = catchAsync(async (req: Request, res: Response) => {
  const filterFields = [
    'searchTerm',
    'name',
    'description',
    'contact_person',
    'email',
    'phone',
    'address',
    'city',
    'country',
    'tax_id',
    'payment_terms',
    'credit_limit',
    'current_balance',
    'status',
    'rating',
    'notes',
  ];
  const filters = pick(req.query, filterFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await SupplierService.getAllSuppliers(
    filters,
    paginationOptions
  );

  const paginationMeta = result.meta
    ? {
        page: result.meta.page ?? 1,
        limit: result.meta.limit ?? 10,
        total: result.meta.total ?? 0,
        ...paginationHelpers.calculatePaginationMetadata(
          result.meta.page ?? 1,
          result.meta.limit ?? 10,
          result.meta.total ?? 0
        ),
      }
    : undefined;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Suppliers retrieved successfully',
    data: result.data,
    meta: paginationMeta,
  });
});

const getSingleSupplier = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await SupplierService.getSingleSupplier(id);

  sendResponse<ISupplier>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Supplier retrieved successfully',
    data: result,
  });
});

const updateSupplier = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const payload = req.body;

  const result = await SupplierService.updateSupplier(id, payload);

  sendResponse<ISupplier>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Supplier updated successfully',
    data: result,
  });
});

const deleteSupplier = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await SupplierService.deleteSupplier(id);

  sendResponse<ISupplier>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Supplier deleted successfully',
    data: result,
  });
});

export const SupplierController = {
  createSupplier,
  getAllSuppliers,
  getSingleSupplier,
  updateSupplier,
  deleteSupplier,
};

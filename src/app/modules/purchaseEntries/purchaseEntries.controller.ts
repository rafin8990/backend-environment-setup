import { Request, Response } from 'express';
import * as httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { PurchaseEntryService } from './purchaseEntries.service';
import { PurchaseEntryValidation } from './purchaseEntries.validation';

const createPurchaseEntry = catchAsync(async (req: Request, res: Response) => {
  const validatedData = PurchaseEntryValidation.createPurchaseEntryZodSchema.parse(req);
  const result = await PurchaseEntryService.createPurchaseEntry(validatedData.body);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Purchase entry created successfully!',
    data: result,
  });
});

const getSinglePurchaseEntry = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PurchaseEntryService.getSinglePurchaseEntry(Number(id));
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Purchase entry not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase entry retrieved successfully!',
    data: result,
  });
});

const getAllPurchaseEntries = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'searchTerm',
    'po_id',
    'grn_id',
    'payment_status',
    'created_by',
    'start_date',
    'end_date',
  ]);
  
  const paginationOptions = pick(req.query, [
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  
  const result = await PurchaseEntryService.getAllPurchaseEntries(filters, paginationOptions);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase entries retrieved successfully!',
    data: result.data,
    meta: result.meta ? {
      page: result.meta.page || 1,
      limit: result.meta.limit || 10,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      hasNext: result.meta.hasNext,
      hasPrev: result.meta.hasPrev,
    } : undefined,
  });
});

const updatePurchaseEntry = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = PurchaseEntryValidation.updatePurchaseEntryZodSchema.parse(req);
  const result = await PurchaseEntryService.updatePurchaseEntry(Number(id), validatedData.body);
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Purchase entry not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase entry updated successfully!',
    data: result,
  });
});

const updatePaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = PurchaseEntryValidation.updatePaymentStatusZodSchema.parse(req);
  const result = await PurchaseEntryService.updatePaymentStatus(
    Number(id), 
    validatedData.body.payment_status,
    validatedData.body.payment_method || undefined,
    validatedData.body.payment_reference || undefined
  );
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Purchase entry not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment status updated successfully!',
    data: result,
  });
});

// New method for GRN-based PE creation
const createPEFromGRN = catchAsync(async (req: Request, res: Response) => {
  const { grnId, amountPaid, paymentStatus, paymentMethod, paymentReference, notes, created_by } = req.body;
  
  const result = await PurchaseEntryService.createPEFromGRN(
    Number(grnId),
    amountPaid,
    paymentStatus,
    paymentMethod,
    paymentReference,
    notes,
    created_by ? Number(created_by) : undefined
  );
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Purchase entry created from GRN successfully!',
    data: result,
  });
});

// New method for PO-based PE creation (bypass GRN)
const createPEFromPO = catchAsync(async (req: Request, res: Response) => {
  const { poId, amountPaid, paymentStatus, paymentMethod, paymentReference, notes, created_by } = req.body;
  
  const result = await PurchaseEntryService.createPEFromPO(
    Number(poId),
    amountPaid,
    paymentStatus,
    paymentMethod,
    paymentReference,
    notes,
    created_by ? Number(created_by) : undefined
  );
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Purchase entry created from PO successfully!',
    data: result,
  });
});

const deletePurchaseEntry = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PurchaseEntryService.deletePurchaseEntry(Number(id));
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Purchase entry not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase entry deleted successfully!',
    data: result,
  });
});

export const PurchaseEntryController = {
  createPurchaseEntry,
  getSinglePurchaseEntry,
  getAllPurchaseEntries,
  updatePurchaseEntry,
  updatePaymentStatus,
  createPEFromGRN,
  createPEFromPO,
  deletePurchaseEntry,
};

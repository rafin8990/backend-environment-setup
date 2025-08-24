import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { IGRN, IGRNCreate } from './grns.interface';
import { GRNService } from './grns.service';
import { GRNValidation } from './grns.validation';

const createGRN = catchAsync(async (req: Request, res: Response) => {
  const validatedData = GRNValidation.createGRNZodSchema.parse(req);
  const result = await GRNService.createGRN(validatedData.body as IGRNCreate) as IGRN;
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'GRN created successfully!',
    data: result,
  });
});

const getSingleGRN = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await GRNService.getSingleGRN(Number(id));
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'GRN not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'GRN retrieved successfully!',
    data: result,
  });
});

const getAllGRNs = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'searchTerm',
    'batch_id',
    'purchase_order_id',
    'destination_location_id',
    'status',
    'receiver_id',
    'start_date',
    'end_date',
  ]);
  
  const paginationOptions = pick(req.query, [
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ]);
  
  const result = await GRNService.getAllGRNs(filters, paginationOptions);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'GRNs retrieved successfully!',
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

const updateGRN = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = GRNValidation.updateGRNZodSchema.parse(req);
  const result = await GRNService.updateGRN(Number(id), validatedData.body);
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'GRN not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'GRN updated successfully!',
    data: result,
  });
});

const updateGRNStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = GRNValidation.updateGRNStatusZodSchema.parse(req);
  const result = await GRNService.updateGRNStatus(
    Number(id), 
    validatedData.body.status,
    validatedData.body.receiver_id || undefined
  );
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'GRN not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'GRN status updated successfully!',
    data: result,
  });
});

const deleteGRN = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await GRNService.deleteGRN(Number(id));
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'GRN not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'GRN deleted successfully!',
    data: result,
  });
});

// New method for PO-based GRN creation
const createGRNFromPO = catchAsync(async (req: Request, res: Response) => {
  const { purchaseOrderId, receivedAt, destinationLocationId, items, receiverId, notes } = req.body;
  
  const result = await GRNService.createGRNFromPO(
    Number(purchaseOrderId),
    receivedAt,
    Number(destinationLocationId),
    items,
    receiverId ? Number(receiverId) : null,
    notes
  );
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'GRN created from purchase order successfully!',
    data: result,
  });
});

export const GRNController = {
  createGRN,
  getSingleGRN,
  getAllGRNs,
  updateGRN,
  updateGRNStatus,
  deleteGRN,
  createGRNFromPO,
};

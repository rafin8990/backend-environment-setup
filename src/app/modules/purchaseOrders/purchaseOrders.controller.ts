import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { PurchaseOrderService } from './purchaseOrders.service';
import { PurchaseOrderValidation } from './purchaseOrders.validation';

const createPurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const validatedData = PurchaseOrderValidation.createPurchaseOrderZodSchema.parse(req);
  const result = await PurchaseOrderService.createPurchaseOrder(validatedData.body);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Purchase order created successfully!',
    data: result,
  });
});

const getSinglePurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PurchaseOrderService.getSinglePurchaseOrder(Number(id));
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Purchase order not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase order retrieved successfully!',
    data: result,
  });
});

const getAllPurchaseOrders = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'searchTerm',
    'supplier_id',
    'status',
    'order_type',
    'delivery_type',
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
  
  const result = await PurchaseOrderService.getAllPurchaseOrders(filters, paginationOptions);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase orders retrieved successfully!',
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

const updatePurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = PurchaseOrderValidation.updatePurchaseOrderZodSchema.parse(req);
  const result = await PurchaseOrderService.updatePurchaseOrder(Number(id), validatedData.body);
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Purchase order not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase order updated successfully!',
    data: result,
  });
});

const updatePurchaseOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = PurchaseOrderValidation.updatePurchaseOrderStatusZodSchema.parse(req);
  const result = await PurchaseOrderService.updatePurchaseOrderStatus(
    Number(id), 
    validatedData.body.status,
    validatedData.body.approved_by
  );
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Purchase order not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase order status updated successfully!',
    data: result,
  });
});

const deletePurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PurchaseOrderService.deletePurchaseOrder(Number(id));
  
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Purchase order not found',
      data: null,
    });
    return;
  }
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase order deleted successfully!',
    data: result,
  });
});

// New methods for requisition-based PO creation
const createPOFromRequisition = catchAsync(async (req: Request, res: Response) => {
  const { requisitionId, supplierId, expectedDeliveryDate, notes } = req.body;
  const createdBy = (req.user as any)?.id;
  
  const result = await PurchaseOrderService.createPOFromRequisition(
    Number(requisitionId),
    Number(supplierId),
    expectedDeliveryDate,
    createdBy,
    notes
  );
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Purchase order created from requisition successfully!',
    data: result,
  });
});

const createConsolidatedPO = catchAsync(async (req: Request, res: Response) => {
  const { requisitionIds, supplierId, expectedDeliveryDate, centralDeliveryLocationId, notes } = req.body;
  const createdBy = (req.user as any)?.id;
  
  const result = await PurchaseOrderService.createConsolidatedPO(
    requisitionIds,
    Number(supplierId),
    expectedDeliveryDate,
    Number(centralDeliveryLocationId),
    createdBy,
    notes
  );
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Consolidated purchase order created successfully!',
    data: result,
  });
});

const getPOsByRequisition = catchAsync(async (req: Request, res: Response) => {
  const { requisitionId } = req.params;
  const result = await PurchaseOrderService.getPOsByRequisition(Number(requisitionId));
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase orders for requisition retrieved successfully!',
    data: result,
  });
});

const getPOsBySupplier = catchAsync(async (req: Request, res: Response) => {
  const { supplierId } = req.params;
  const result = await PurchaseOrderService.getPOsBySupplier(Number(supplierId));
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase orders for supplier retrieved successfully!',
    data: result,
  });
});

export const PurchaseOrderController = {
  createPurchaseOrder,
  getSinglePurchaseOrder,
  getAllPurchaseOrders,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  createPOFromRequisition,
  createConsolidatedPO,
  getPOsByRequisition,
  getPOsBySupplier,
};

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IStockTransferFilters } from './stockTransfers.interface';
import StockTransferService from './stockTransfers.service';
import { createStockTransferSchema, stockTransferFiltersSchema, updateStockTransferSchema } from './stockTransfers.validation';

class StockTransferController {
  createStockTransfer = catchAsync(async (req: Request, res: Response) => {
    const validatedData = createStockTransferSchema.parse(req.body);
    const result = await StockTransferService.createStockTransfer(validatedData);
    
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Stock transfer created successfully!',
      data: result,
    });
  });

  getAllStockTransfers = catchAsync(async (req: Request, res: Response) => {
    const filters = stockTransferFiltersSchema.parse(req.query);
    const result = await StockTransferService.getAllStockTransfers(filters);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfers retrieved successfully!',
      data: result,
    });
  });

  getStockTransferById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await StockTransferService.getStockTransferById(Number(id));
    
    if (!result) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: 'Stock transfer not found',
        data: null,
      });
    }
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfer retrieved successfully!',
      data: result,
    });
  });

  updateStockTransfer = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData = updateStockTransferSchema.parse(req.body);
    const result = await StockTransferService.updateStockTransfer(Number(id), validatedData);
    
    if (!result) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: 'Stock transfer not found',
        data: null,
      });
    }
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfer updated successfully!',
      data: result,
    });
  });

  deleteStockTransfer = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await StockTransferService.deleteStockTransfer(Number(id));
    
    if (!result) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: 'Stock transfer not found',
        data: null,
      });
    }
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfer deleted successfully!',
      data: result,
    });
  });

  // New methods for independent workflow
  createIndependentStockTransfer = catchAsync(async (req: Request, res: Response) => {
    const { sourceLocationId, destinationLocationId, transferType, items, options } = req.body;
    const createdBy = (req.user as any)?.id;
    
    const result = await StockTransferService.createIndependentStockTransfer(
      Number(sourceLocationId),
      Number(destinationLocationId),
      transferType,
      items,
      createdBy,
      options
    );
    
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Independent stock transfer created successfully!',
      data: result,
    });
  });

  createGRNBasedStockTransfer = catchAsync(async (req: Request, res: Response) => {
    const { grnId, sourceLocationId, destinationLocationId, items, notes } = req.body;
    const createdBy = (req.user as any)?.id;
    
    const result = await StockTransferService.createGRNBasedStockTransfer(
      Number(grnId),
      Number(sourceLocationId),
      Number(destinationLocationId),
      items,
      createdBy,
      notes
    );
    
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'GRN-based stock transfer created successfully!',
      data: result,
    });
  });

  createPEBasedStockTransfer = catchAsync(async (req: Request, res: Response) => {
    const { purchaseEntryId, sourceLocationId, destinationLocationId, items, notes } = req.body;
    const createdBy = (req.user as any)?.id;
    
    const result = await StockTransferService.createPEBasedStockTransfer(
      Number(purchaseEntryId),
      Number(sourceLocationId),
      Number(destinationLocationId),
      items,
      createdBy,
      notes
    );
    
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Purchase entry-based stock transfer created successfully!',
      data: result,
    });
  });

  // New method for requisition-based stock transfer
  createStockTransferFromRequisition = catchAsync(async (req: Request, res: Response) => {
    const { requisitionId, sourceLocationId, destinationLocationId, items, notes } = req.body;
    const createdBy = (req.user as any)?.id;
    
    const result = await StockTransferService.createStockTransferFromRequisition(
      Number(requisitionId),
      Number(sourceLocationId),
      Number(destinationLocationId),
      items,
      createdBy,
      notes
    );
    
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Stock transfer created from requisition successfully!',
      data: result,
    });
  });

  getStockTransfersByGRN = catchAsync(async (req: Request, res: Response) => {
    const { grnId } = req.params;
    const result = await StockTransferService.getStockTransfersByGRN(Number(grnId));
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfers for GRN retrieved successfully!',
      data: result,
    });
  });

  getStockTransfersByPurchaseEntry = catchAsync(async (req: Request, res: Response) => {
    const { purchaseEntryId } = req.params;
    const result = await StockTransferService.getStockTransfersByPurchaseEntry(Number(purchaseEntryId));
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfers for purchase entry retrieved successfully!',
      data: result,
    });
  });

  // Legacy methods for backward compatibility
  getStockTransfersByPurchaseOrder = catchAsync(async (req: Request, res: Response) => {
    const { purchaseOrderId } = req.params;
    const filters: IStockTransferFilters = { purchase_order_id: Number(purchaseOrderId) };
    const result = await StockTransferService.getAllStockTransfers(filters);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfers for purchase order retrieved successfully!',
      data: result,
    });
  });

  getStockTransfersByRequisition = catchAsync(async (req: Request, res: Response) => {
    const { requisitionId } = req.params;
    const filters: IStockTransferFilters = { requisition_id: Number(requisitionId) };
    const result = await StockTransferService.getAllStockTransfers(filters);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfers for requisition retrieved successfully!',
      data: result,
    });
  });

  approveStockTransfer = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const approvedBy = (req.user as any)?.id;
    
    const result = await StockTransferService.approveStockTransfer(Number(id), approvedBy);
    
    if (!result) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: 'Stock transfer not found',
        data: null,
      });
    }
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfer approved successfully!',
      data: result,
    });
  });

  dispatchStockTransfer = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const dispatchedBy = (req.user as any)?.id;
    
    const result = await StockTransferService.dispatchStockTransfer(Number(id), dispatchedBy);
    
    if (!result) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: 'Stock transfer not found',
        data: null,
      });
    }
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfer dispatched successfully!',
      data: result,
    });
  });

  receiveStockTransfer = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { items } = req.body;
    const receivedBy = (req.user as any)?.id;
    
    const result = await StockTransferService.receiveStockTransfer(Number(id), receivedBy, items);
    
    if (!result) {
      return sendResponse(res, {
        statusCode: httpStatus.NOT_FOUND,
        success: false,
        message: 'Stock transfer not found',
        data: null,
      });
    }
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stock transfer received successfully!',
      data: result,
    });
  });
}

export default new StockTransferController();

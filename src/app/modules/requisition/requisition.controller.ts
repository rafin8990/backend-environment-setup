import catchAsync from '../../../shared/catchAsync';
import { Request, Response } from 'express';
import { IRequisitionCreateRequest, IRequisitionUpdateRequest, IRequisitionFilters, IRequisitionReceiveRequest } from './requisition.interface';
import { RequisitionService } from './requisition.service';
import sendResponse from '../../../shared/sendResponse';
import httpStatus from 'http-status';
import pick from '../../../shared/pick';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const createRequisition = catchAsync(async (req: Request, res: Response) => {
  const requisitionData = req.body as IRequisitionCreateRequest;

  const result = await RequisitionService.createRequisition(requisitionData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Requisition created successfully!',
    data: result,
  });
});

const getAllRequisitions = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'searchTerm',
    'status',
    'source_location_id',
    'created_by',
    'created_at',
    'start_date',
    'end_date',
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  // Convert numeric filters
  const processedFilters: IRequisitionFilters = { ...filters };
  if (processedFilters.source_location_id) {
    processedFilters.source_location_id = Number(processedFilters.source_location_id);
  }
  if (processedFilters.created_by) {
    processedFilters.created_by = Number(processedFilters.created_by);
  }

  const result = await RequisitionService.getAllRequisitions(processedFilters, paginationOptions);

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
    message: 'Requisitions retrieved successfully!',
    meta: paginationMeta,
    data: result.data,
  });
});

const getPendingRequisitionsAnalysis = catchAsync(async (req: Request, res: Response) => {
  const result = await RequisitionService.getPendingRequisitionsAnalysis();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pending requisitions analysis retrieved successfully!',
    data: result,
  });
});

const getSingleRequisition = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await RequisitionService.getSingleRequisition(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition retrieved successfully!',
    data: result,
  });
});

const updateRequisition = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updateData = req.body as IRequisitionUpdateRequest;

  const result = await RequisitionService.updateRequisition(id, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition updated successfully!',
    data: result,
  });
});

const deleteRequisition = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await RequisitionService.deleteRequisition(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition deleted successfully!',
  });
});

const getRequisitionStatsByDateRange = catchAsync(async (req: Request, res: Response) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Both start_date and end_date are required',
    });
  }

  const result = await RequisitionService.getRequisitionStatsByDateRange(
    start_date as string,
    end_date as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition statistics retrieved successfully!',
    data: result,
  });
});

const getRequisitionsByItemId = catchAsync(async (req: Request, res: Response) => {
  const itemId = Number(req.params.itemId);
  const result = await RequisitionService.getRequisitionsByItemId(itemId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisitions by item retrieved successfully!',
    data: result,
  });
});

const getRequisitionsByDestinationLocation = catchAsync(async (req: Request, res: Response) => {
  const locationId = Number(req.params.locationId);
  const result = await RequisitionService.getRequisitionsByDestinationLocation(locationId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisitions by destination location retrieved successfully!',
    data: result,
  });
});

const getRequisitionsByStatus = catchAsync(async (req: Request, res: Response) => {
  const status = req.params.status as 'pending' | 'approved' | 'received';
  const result = await RequisitionService.getRequisitionsByStatus(status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisitions by status retrieved successfully!',
    data: result,
  });
});

const getRequisitionsByDateRange = catchAsync(async (req: Request, res: Response) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Both start_date and end_date are required',
    });
  }

  const result = await RequisitionService.getRequisitionsByDateRange(
    start_date as string,
    end_date as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisitions by date range retrieved successfully!',
    data: result,
  });
});

const getRequisitionsByUser = catchAsync(async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const result = await RequisitionService.getRequisitionsByUser(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisitions by user retrieved successfully!',
    data: result,
  });
});

const approveRequisition = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await RequisitionService.approveRequisition(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition approved successfully!',
    data: result,
  });
});

const markRequisitionAsReceived = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { items_received } = req.body as IRequisitionReceiveRequest;
  const result = await RequisitionService.markRequisitionAsReceived(id, items_received);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition marked as received successfully!',
    data: result,
  });
});

export const RequisitionController = {
  createRequisition,
  getAllRequisitions,
  getPendingRequisitionsAnalysis,
  getSingleRequisition,
  updateRequisition,
  deleteRequisition,
  getRequisitionStatsByDateRange,
  getRequisitionsByItemId,
  getRequisitionsByDestinationLocation,
  getRequisitionsByStatus,
  getRequisitionsByDateRange,
  getRequisitionsByUser,
  approveRequisition,
  markRequisitionAsReceived,
};

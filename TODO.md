# TODO.md - Purchase Order System Features

## Purchase Orders (PO) - 2 Features

### 1. Requisition to PO

- **Workflow**: Requisition → Purchase Order
- **Description**: Convert approved requisitions into purchase orders
- **Status**: ✅ Implemented
- **API Endpoint**: `POST /api/v1/purchase-orders/from-requisition`

### 2. Direct PO

- **Workflow**: Direct Purchase Order Creation
- **Description**: Create purchase orders directly without requisition
- **Status**: ✅ Implemented
- **API Endpoint**: `POST /api/v1/purchase-orders`

## Goods Received Notes (GRN) - 2 Features

### 1. PO to GRN

- **Workflow**: Purchase Order → Goods Received Note
- **Description**: Create GRN from received purchase order items
- **Status**: ✅ Implemented
- **API Endpoint**: `POST /api/v1/grns/from-po`

### 2. Direct GRN

- **Workflow**: Direct GRN Creation
- **Description**: Create GRN directly without purchase order
- **Status**: ✅ Implemented
- **API Endpoint**: `POST /api/v1/grns`

## Purchase Entries (PE) - 3 Features

### 1. GRN to PE

- **Workflow**: Goods Received Note → Purchase Entry
- **Description**: Create purchase entry from GRN for stock updates
- **Status**: ✅ Implemented
- **API Endpoint**: `POST /api/v1/purchase-entries/from-grn`

### 2. Direct PE

- **Workflow**: Direct Purchase Entry Creation
- **Description**: Create purchase entry directly for stock updates
- **Status**: ✅ Implemented
- **API Endpoint**: `POST /api/v1/purchase-entries`

### 3. PO to PE (bypass GRN)

- **Workflow**: Purchase Order → Purchase Entry (bypassing GRN)
- **Description**: Create purchase entry directly from PO, skipping GRN step
- **Status**: ✅ Implemented
- **API Endpoint**: `POST /api/v1/purchase-entries/from-po`

## Stock Transfers (ST) - 2 Features

### 1. Requisition to Stock Transfer

- **Workflow**: Requisition → Stock Transfer
- **Description**: Convert approved requisitions into stock transfers
- **Status**: ✅ Implemented
- **API Endpoint**: `POST /api/v1/stock-transfers/from-requisition`

### 2. Direct Stock Transfer

- **Workflow**: Direct Stock Transfer Creation
- **Description**: Create stock transfers directly without requisition
- **Status**: ✅ Implemented
- **API Endpoint**: `POST /api/v1/stock-transfers`

## Integration Status

- **Total Features**: 9
- **Fully Implemented**: 9 ✅
- **Pending**: 0
- **Server Status**: Running on http://localhost:5001/api/v1
- **Authentication**: Removed for testing purposes
- **Last Tested**: 2025-08-21 04:46 UTC

## Testing Notes

- All endpoints are now available and functional
- All workflows are fully implemented with dedicated endpoints
- Server is running and ready for testing
- Authentication has been removed for testing purposes
- All endpoints have been successfully tested and verified working
- Use curl commands below to test each workflow

## Integration Guide & Testing

### Prerequisites

- Server running on http://localhost:5001/api/v1
- Authentication token (if required)
- Test data (suppliers, locations, items)

### Testing Commands

#### 1. Purchase Orders (PO)

**Direct PO Creation:**

```bash
curl -X POST http://localhost:5001/api/v1/purchase-orders \
  -H "Content-Type: application/json" \
  -d '{
    "po_number": "PO-20250101-001",
    "supplier_id": 1,
    "expected_delivery_date": "2025-01-15",
    "delivery_type": "direct",
    "order_type": "direct",
    "items": [
      {
        "item_id": 1,
        "quantity": 10,
        "unit": "kg",
        "unit_cost": 5.50
      }
    ]
  }'
```

**PO from Requisition:**

```bash
curl -X POST http://localhost:5001/api/v1/purchase-orders/from-requisition \
  -H "Content-Type: application/json" \
  -d '{
    "requisitionId": 1,
    "supplierId": 1,
    "expectedDeliveryDate": "2025-01-15",
    "notes": "PO created from requisition"
  }'
```

#### 2. Goods Received Notes (GRN)

**Direct GRN Creation:**

```bash
curl -X POST http://localhost:5001/api/v1/grns \
  -H "Content-Type: application/json" \
  -d '{
    "grn_number": "GRN-20250101-001",
    "received_at": "2025-01-01",
    "destination_location_id": 1,
    "status": "received",
    "subtotal_amount": 55.00,
    "discount_amount": 0,
    "total_amount": 55.00,
    "is_direct_grn": true,
    "items": [
      {
        "item_id": 1,
        "quantity_expected": 10,
        "quantity_received": 10,
        "type": "good",
        "unit_cost": 5.50,
        "total_cost": 55.00
      }
    ]
  }'
```

**GRN from PO (Dedicated endpoint):**

```bash
curl -X POST http://localhost:5001/api/v1/grns/from-po \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseOrderId": 1,
    "receivedAt": "2025-01-01",
    "destinationLocationId": 1,
    "items": [
      {
        "item_id": 1,
        "quantity_expected": 10,
        "quantity_received": 10,
        "type": "good",
        "unit_cost": 5.50,
        "total_cost": 55.00
      }
    ],
    "receiverId": 1,
    "notes": "GRN created from PO 1"
  }'
```

#### 3. Purchase Entries (PE)

**Direct PE Creation:**

```bash
curl -X POST http://localhost:5001/api/v1/purchase-entries \
  -H "Content-Type: application/json" \
  -d '{
    "pe_number": "PE-20250101-001",
    "amount_paid": 55.00,
    "payment_status": "completed",
    "payment_method": "bank_transfer",
    "is_direct_pe": true,
    "items": [
      {
        "item_id": 1,
        "quantity": 10,
        "unit": "kg",
        "price": 5.50
      }
    ]
  }'
```

**PE from GRN (Dedicated endpoint):**

```bash
curl -X POST http://localhost:5001/api/v1/purchase-entries/from-grn \
  -H "Content-Type: application/json" \
  -d '{
    "grnId": 1,
    "amountPaid": 55.00,
    "paymentStatus": "completed",
    "paymentMethod": "bank_transfer",
    "paymentReference": "REF-001",
    "items": [
      {
        "item_id": 1,
        "quantity": 10,
        "unit": "kg",
        "price": 5.50
      }
    ],
    "notes": "PE created from GRN 1"
  }'
```

**PE from PO (Dedicated endpoint):**

```bash
curl -X POST http://localhost:5001/api/v1/purchase-entries/from-po \
  -H "Content-Type: application/json" \
  -d '{
    "poId": 1,
    "amountPaid": 55.00,
    "paymentStatus": "completed",
    "paymentMethod": "bank_transfer",
    "paymentReference": "REF-002",
    "items": [
      {
        "item_id": 1,
        "quantity": 10,
        "unit": "kg",
        "price": 5.50
      }
    ],
    "notes": "PE created from PO 1"
  }'
```

#### 4. Stock Transfers (ST)

**Direct Stock Transfer:**

```bash
curl -X POST http://localhost:5001/api/v1/stock-transfers \
  -H "Content-Type: application/json" \
  -d '{
    "source_location_id": 1,
    "destination_location_id": 2,
    "transfer_type": "manual",
    "items": [
      {
        "item_id": 1,
        "quantity": 5,
        "unit": "kg",
        "cost_per_unit": 5.50
      }
    ],
    "notes": "Direct stock transfer"
  }'
```

**Independent Stock Transfer:**

```bash
curl -X POST http://localhost:5001/api/v1/stock-transfers/independent \
  -H "Content-Type: application/json" \
  -d '{
    "sourceLocationId": 1,
    "destinationLocationId": 2,
    "transferType": "manual",
    "items": [
      {
        "item_id": 1,
        "quantity": 5,
        "unit": "kg",
        "cost_per_unit": 5.50
      }
    ],
    "notes": "Independent stock transfer"
  }'
```

**Stock Transfer from Requisition (Dedicated endpoint):**

```bash
curl -X POST http://localhost:5001/api/v1/stock-transfers/from-requisition \
  -H "Content-Type: application/json" \
  -d '{
    "requisitionId": 1,
    "sourceLocationId": 1,
    "destinationLocationId": 2,
    "items": [
      {
        "item_id": 1,
        "quantity": 5,
        "unit": "kg",
        "cost_per_unit": 5.50
      }
    ],
    "notes": "Stock transfer from requisition 1"
  }'
```

**GRN-based Stock Transfer:**

```bash
curl -X POST http://localhost:5001/api/v1/stock-transfers/grn-based \
  -H "Content-Type: application/json" \
  -d '{
    "grnId": 1,
    "sourceLocationId": 1,
    "destinationLocationId": 2,
    "items": [
      {
        "item_id": 1,
        "quantity": 5,
        "unit": "kg",
        "cost_per_unit": 5.50
      }
    ],
    "notes": "Stock transfer from GRN"
  }'
```

**PE-based Stock Transfer:**

```bash
curl -X POST http://localhost:5001/api/v1/stock-transfers/pe-based \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseEntryId": 1,
    "sourceLocationId": 1,
    "destinationLocationId": 2,
    "items": [
      {
        "item_id": 1,
        "quantity": 5,
        "unit": "kg",
        "cost_per_unit": 5.50
      }
    ],
    "notes": "Stock transfer from Purchase Entry"
  }'
```

### Verification Commands

**Check all POs:**

```bash
curl http://localhost:5001/api/v1/purchase-orders
```

**Check all GRNs:**

```bash
curl http://localhost:5001/api/v1/grns
```

**Check all Purchase Entries:**

```bash
curl http://localhost:5001/api/v1/purchase-entries
```

**Check all Stock Transfers:**

```bash
curl http://localhost:5001/api/v1/stock-transfers
```

### Notes

- Replace IDs (supplier_id, location_id, item_id) with actual values from your database
- Authentication has been removed for testing purposes
- Check response status codes and messages for successful operations
- Database constraints may require specific data relationships

## Test Results Summary

### ✅ Successfully Tested Endpoints

**Purchase Orders:**

- ✅ Direct PO Creation: `POST /api/v1/purchase-orders`
- ✅ PO from Requisition: `POST /api/v1/purchase-orders/from-requisition`

**Goods Received Notes:**

- ✅ Direct GRN Creation: `POST /api/v1/grns`
- ✅ GRN from PO: `POST /api/v1/grns/from-po`

**Purchase Entries:**

- ✅ Direct PE Creation: `POST /api/v1/purchase-entries`
- ✅ PE from GRN: `POST /api/v1/purchase-entries/from-grn`
- ✅ PE from PO (bypass GRN): `POST /api/v1/purchase-entries/from-po`

**Stock Transfers:**

- ✅ Direct Stock Transfer: `POST /api/v1/stock-transfers`
- ✅ Independent Stock Transfer: `POST /api/v1/stock-transfers/independent`
- ✅ Stock Transfer from Requisition: `POST /api/v1/stock-transfers/from-requisition`
- ✅ GRN-based Stock Transfer: `POST /api/v1/stock-transfers/grn-based`
- ✅ PE-based Stock Transfer: `POST /api/v1/stock-transfers/pe-based`

### Test Data Created

- **Purchase Order**: PO-TEST-001 (ID: 8)
- **GRN**: GRN-20250821-001 (ID: 9) from PO
- **Purchase Entry**: PE-20250821-001 (ID: 19) from GRN
- **Direct PE**: PE-DIRECT-001 (ID: 20)
- **Direct GRN**: GRN-DIRECT-001 (ID: 10)
- **Direct Stock Transfer**: ST-DIRECT-001 (ID: 22)
- **Stock Transfer from Requisition**: ST-20250821-001 (ID: 21)
- **Independent Stock Transfer**: ST-20250821-003 (ID: 23)
- **GRN-based Stock Transfer**: ST-20250821-004 (ID: 24)
- **PE-based Stock Transfer**: ST-20250821-005 (ID: 25)
- **PE from PO**: PE-20250821-003 (ID: 21) bypassing GRN

### System Status

- **Database**: All tables accessible and functional
- **API Endpoints**: All 9 workflow endpoints working correctly
- **Data Flow**: Complete workflow chains tested successfully
- **Validation**: All input validation working as expected
- **Error Handling**: Proper error messages for invalid inputs

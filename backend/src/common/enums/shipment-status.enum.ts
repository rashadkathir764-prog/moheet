export enum ShipmentStatus {
  PENDING = 'PENDING',
  READY_TO_SHIP = 'READY_TO_SHIP',
  SHIPPED = 'SHIPPED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

export const ALLOWED_SHIPMENT_STATUS_TRANSITIONS: Record<
  ShipmentStatus,
  ShipmentStatus[]
> = {
  [ShipmentStatus.PENDING]: [
    ShipmentStatus.READY_TO_SHIP,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.READY_TO_SHIP]: [
    ShipmentStatus.SHIPPED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.SHIPPED]: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED,
  ],
  [ShipmentStatus.IN_TRANSIT]: [
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED,
  ],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED,
  ],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.FAILED]: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.RETURNED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.RETURNED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

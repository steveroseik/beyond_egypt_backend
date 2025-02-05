import { registerEnumType } from '@nestjs/graphql';

export enum AllergyCategory {
  'food',
  'pet',
  'drug',
  'pollen',
  'latex',
  'mold',
  'insects',
}

registerEnumType(AllergyCategory, {
  name: 'AllergyCategory',
});

export enum FileType {
  video = 'video',
  image = 'image',
  audio = 'audio',
  pdf = 'pdf',
  doc = 'doc',
  other = 'other',
}

registerEnumType(FileType, {
  name: 'FileType',
});

export enum PaymentMethod {
  fawry = 'fawry',
  instapay = 'instapay',
  cash = 'cash',
}

registerEnumType(PaymentMethod, {
  name: 'PaymentMethod',
});

export enum CampRegistrationStatus {
  idle = 'idle',
  accepted = 'accepted',
  rejected = 'rejected',
  cancelled = 'cancelled',
  modified = 'modified',
}

registerEnumType(CampRegistrationStatus, {
  name: 'CampRegistrationStatus',
});

export enum ShirtSize {
  xxs = 'xxs',
  xs = 'xs',
  s = 's',
  m = 'm',
  l = 'l',
  xl = 'xl',
  xxl = 'xxl',
}

registerEnumType(ShirtSize, {
  name: 'ShirtSize',
});

export enum ParentRelation {
  father = 'father',
  mother = 'mother',
  grandParent = 'grandParent',
  uncle = 'uncle',
}

registerEnumType(ParentRelation, {
  name: 'ParentRelation',
});

export enum ChildReportType {
  'incident',
}

registerEnumType(ChildReportType, {
  name: 'ChildReportType',
});

export enum ChildReportStatus {
  new = 'new',
  followUp = 'followUp',
  closed = 'closed',
}

registerEnumType(ChildReportStatus, {
  name: 'ChildReportStatus',
});

export enum UserType {
  admin = 'admin',
  parent = 'parent',
  customerService = 'customerService',
}

registerEnumType(UserType, {
  name: 'UserType',
});

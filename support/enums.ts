import { registerEnumType } from '@nestjs/graphql';

export enum AllergyCategory {
  food = 'food',
  pet = 'pet',
  drug = 'drug',
  pollen = 'pollen',
  latex = 'latex',
  mold = 'mold',
  insects = 'insects',
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
  pending = 'pending',
  accepted = 'accepted',
  rejected = 'rejected',
  cancelled = 'cancelled',
  modified = 'modified',
  refunded = 'refunded',
}

registerEnumType(CampRegistrationStatus, {
  name: 'CampRegistrationStatus',
});

export enum PaymentStatus {
  pending = 'pending',
  paid = 'paid',
  failed = 'failed',
  expired = 'expired',
}

registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
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
  aunt = 'aunt',
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

export enum FileExtensions {
  // Video extensions
  mp4 = 'mp4',
  mkv = 'mkv',
  avi = 'avi',
  mov = 'mov',
  wmv = 'wmv',
  flv = 'flv',

  // Image extensions
  jpg = 'jpg',
  jpeg = 'jpeg',
  png = 'png',
  gif = 'gif',
  bmp = 'bmp',
  tiff = 'tiff',
  svg = 'svg',
  webp = 'webp',
  jfif = 'jfif',

  // Audio extensions
  mp3 = 'mp3',
  wav = 'wav',
  aac = 'aac',
  flac = 'flac',
  ogg = 'ogg',
  wma = 'wma',
  m4a = 'm4a',

  // PDF extension
  pdf = 'pdf',

  // DOCX extensions
  docx = 'docx',
  doc = 'doc',
  dotx = 'dotx',
  dot = 'dot',
}

registerEnumType(FileExtensions, {
  name: 'FileExtensions',
});

export enum UsersOrderField {
  name = 'name',
  email = 'email',
  phone = 'phone',
  district = 'district',
  createdAt = 'createdAt',
  lastModified = 'lastModified',
}

registerEnumType(UsersOrderField, {
  name: 'UsersOrderField',
});

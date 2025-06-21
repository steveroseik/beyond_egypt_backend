export function generateCampRegCode({
  campRegistrationId,
  parentId,
}: {
  campRegistrationId: number;
  parentId: string;
}): string {
  return `R${campRegistrationId}${parentId.substring(0, 2).toUpperCase()}`;
}

export function parseCampRegCode(code: string): {
  campRegistrationId: number;
  parentPartialId: string;
} {
  const match = code.match(/^R(\d+)([A-Z0-9]{2})$/);

  if (!match) {
    throw new Error('Invalid camp registration code format');
  }

  const campRegistrationId = parseInt(match[1], 10);
  const parentPartialId = match[2];

  return {
    campRegistrationId,
    parentPartialId,
  };
}

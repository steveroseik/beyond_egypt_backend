import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';

export function generateCampRegistrationEmail({
  registration,
  qrCodeUrl,
}: {
  registration: CampRegistration;
  qrCodeUrl: string; // can be a data URL or hosted image
}): string {
  const formatMoney = (val?: any) => (val ? `${val.toFixed(2)} EGP` : '-');

  const tableRows = registration.campVariantRegistrations
    .map((r) => {
      const childName = r.child?.name || 'Unknown Child';
      const campTitle = r.campVariant?.name || 'Unknown Week';
      const price = formatMoney(r.price);
      const meal = formatMoney(r.mealPrice);
      const variantDiscount = formatMoney(r.variantDiscount);
      const mealDiscount = formatMoney(r.mealDiscount);
      const total = r.price
        .plus(r.mealPrice || 0)
        .minus(r.variantDiscount || 0)
        .minus(r.mealDiscount || 0);
      return `
        <tr>
          <td>${childName}</td>
          <td>${campTitle}</td>
          <td>${price}</td>
          <td>${meal}</td>
          <td>${variantDiscount}</td>
          <td>${mealDiscount}</td>
          <td><strong>${formatMoney(total)}</strong></td>
        </tr>
      `;
    })
    .join('');

  const totalAmount = formatMoney(registration.amount);
  const paidAmount = formatMoney(registration.paidAmount);
  const discount = formatMoney(registration.discountAmount);
  const parentName = registration.parent?.name || 'Parent';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: Arial, sans-serif; background: #f6f9fc; padding: 20px; color: #333; }
        .container { max-width: 700px; background: #fff; padding: 30px; border-radius: 10px; margin: auto; box-shadow: 0 3px 6px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 10px; text-align: center; font-size: 14px; }
        th { background-color: #f0f0f0; }
        .summary { margin-top: 20px; font-size: 16px; }
        .qr { text-align: center; margin: 30px 0; }
        .qr img { width: 180px; height: 180px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏕️ Camp Registration Confirmed</h1>
        <p>Dear ${parentName},</p>
        <p>Thank you for registering your children for our camp! Please find the summary of your registration below:</p>

        <table>
          <thead>
            <tr>
              <th>Child</th>
              <th>Camp Week</th>
              <th>Camp Price</th>
              <th>Meal Price</th>
              <th>Camp Discount</th>
              <th>Meal Discount</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="summary">
          <p><strong>Total Amount:</strong> ${totalAmount}</p>
          <p><strong>Paid:</strong> ${paidAmount}</p>
          <p><strong>Overall Discount:</strong> ${discount}</p>
        </div>

        <div class="qr">
          <p>Please present the QR code below at the camp entrance for access:</p>
          <img src="${qrCodeUrl}" alt="QR Code" />
        </div>

        <p>We can't wait to welcome your children to camp!</p>
        <p>Warm regards,<br/>The Camp Team</p>
      </div>
    </body>
    </html>
  `;
}

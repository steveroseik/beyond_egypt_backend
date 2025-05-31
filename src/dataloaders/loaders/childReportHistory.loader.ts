import * as DataLoader from 'dataloader';
import { ChildReportHistoryService } from 'src/child-report-history/child-report-history.service';
import { ChildReportHistory } from 'src/child-report-history/entities/child-report-history.entity';

export class LatestChildReportHistoryLoader {
  public static create(service: ChildReportHistoryService) {
    return new DataLoader<number, ChildReportHistory>(
      async (keys: readonly number[]) => {
        const data = await service.findLatestByChildReportIds(keys);
        return keys.map((key) =>
          data.find((report) => report.childReportId === key || undefined),
        );
      },
    );
  }
}

import { ITimePeriod } from '../models/envelope_search.model';

export function timePeriod(type): ITimePeriod {
  let endDate = new Date().getTime();
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    let startDate = null;
    switch (type) {
      case '30d':
        startDate = endDate - (60 * 60 * 24 * 30 * 1000);
        break;
      case '60d':
        startDate = endDate - (60 * 60 * 24 * 60 * 1000);
        break;
      case '6m':
        startDate = endDate - (60 * 60 * 24 * 30 * 6 * 1000);
        break;
      case 'this_month':
        startDate = new Date(year, month, 1).getTime();
        break;
      case 'last_month':
        startDate = new Date(year, month - 1, 1).getTime();
        endDate = new Date(year, month, 0).getTime();
        break;
      case 'this_year':
        startDate = new Date(year, 0, 1);
        break;
      case 'all_time':
        startDate = null;
        endDate = null;
        break;
      default:
        startDate = null;
        endDate = null;
        break;
    }

    if (startDate == null && endDate == null) {
      return null;
    }
    return {
      start_time: new Date(startDate).toISOString(),
      end_time: new Date(endDate).toISOString()
    } as ITimePeriod;
}
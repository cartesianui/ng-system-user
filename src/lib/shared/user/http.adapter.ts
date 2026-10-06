import { Injectable } from '@angular/core';
import { convertObjectKeysToCamel } from '@cartesianui/platform-core';

@Injectable()
export class UserAdapter {
  constructor() {}

  static adapter(response: any): any {
    return Object.assign({}, response, convertObjectKeysToCamel(response));
  }
}

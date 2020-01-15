export class DynamicField<T> {
  value: T;
  key: string;
  required: boolean;
  order: number;
  controlType: string;
  validator: string;
  maxLength: number;
  showCounter: boolean;
  url: string;
  name: string;
  prepared: boolean;
  recipientRole: string;
  options: any[];
  field_name: string;
  min_checked: number;
  max_checked: number;
  temp_sig: string;
  sig_id: string;
  temp_int: string;
  int_id: string;
  dirty: boolean;
  full_name: string;

  constructor(field_params: {
    value?: T,
    key?: string,
    result?: string,
    required?: boolean,
    order?: number,
    controlType?: string,
    validator?: string,
    maxLength?: number,
    showCounter?: boolean,
    url?: string,
    name?: string,
    prepared?: boolean,
    recipientRole?: string,
    options?: any[],
    field_name?: string,
    min_checked?: number,
    max_checked?: number,
    temp_sig?: string,
    sig_id?: string,
    temp_int?: string,
    int_id?: string,
    dirty?: boolean,
    full_name?: string
  } = {}) {
    this.value = field_params.value;
    this.key = field_params.key || '';
    this.required = !!field_params.required;
    this.order = field_params.order === undefined ? 1 : field_params.order;
    this.controlType = field_params.controlType || '';
    this.validator = field_params.validator === undefined ? '' : field_params.validator;
    this.maxLength = field_params.maxLength == null ? null : field_params.maxLength;
    this.showCounter = field_params.showCounter === false ? false : field_params.showCounter;
    this.prepared = field_params.prepared;
    this.recipientRole = field_params.recipientRole;
    this.options = field_params.options;
    this.field_name = field_params.field_name;
    this.min_checked = field_params.min_checked;
    this.max_checked = field_params.max_checked;
    this.temp_sig = field_params.temp_sig;
    this.sig_id = field_params.sig_id;
    this.temp_int = field_params.temp_int;
    this.int_id = field_params.int_id;
    this.dirty = field_params.dirty;
    this.full_name = field_params.full_name;
    if (field_params.url) {
      this.url = field_params.url;
    }
    if (field_params.name) {
      this.name = field_params.name;
    }
  }
}

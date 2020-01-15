export class FieldData<T> {
  value: T;
  pageNum: number;
  id: number;
  fName: string;
  required: boolean;
  order: number;
  vName: string;
  error: string;
  type: string;

  constructor(options: {
    value?: T,
    pageNum?: number,
    id?: number,
    fName?: string,
    required?:boolean,
    order?: number,
    vName?: string,
    error?: string,
    type?: string
  } = {}) {
    this.value = options.value;
    this.pageNum = options.pageNum;
    this.id = options.id;
    this.fName = options.fName;
    this.required = options.required;
    this.order = options.order;
    this.vName = options.vName;
    this.error = options.error || '';
    this.type = options.type;
  }
}

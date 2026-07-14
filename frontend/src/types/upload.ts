/**
 * Upload types — mirrors backend upload models.
 */

export interface UploadValidationError {
  row: number;
  field: string;
  message: string;
  value: string | null;
}

export interface UploadResult {
  success: boolean;
  filename: string;
  rowsAccepted: number;
  rowsRejected: number;
  errors: UploadValidationError[];
  message: string;
}

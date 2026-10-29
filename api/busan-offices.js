import { handleOffices } from '../server/busan-offices.mjs';

export default function handler(req, res) {
  return handleOffices(req, res);
}

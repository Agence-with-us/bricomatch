import { Request, Response, NextFunction } from 'express';
import { ClientError } from '../helpers/ClientError';

export function clientErrorMiddleware (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Si l'erreur est une instance de ClientError, utiliser le code et le message fournis
  if (err instanceof ClientError) {
    return res.status(err.status).json({
      success: false,
      clientError: err.message,
    });
  }

  // Pour toutes les autres erreurs, tenter d'extraire un code et un message
  const status = (err && typeof err === 'object' && 'status' in err && typeof (err as any).status === 'number')
    ? (err as any).status
    : 500;
  const message = (err && typeof err === 'object' && 'message' in err)
    ? (err as any).message
    : 'Internal Server Error';

  return res.status(status).json({
    success: false,
    clientError: message,
  });
}

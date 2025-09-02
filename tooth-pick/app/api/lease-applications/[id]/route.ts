import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import LeaseApplication from '@/lib/models/LeaseApplication';
import User from '@/lib/models/User';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // Solo admin y lease providers pueden aprobar/rechazar
    if (!['admin'].includes(user.role)) {
      return NextResponse.json({ 
        error: 'No tienes permisos para esta acción.' 
      }, { status: 403 });
    }

    const { action, leaseProvider, adminComments } = await req.json();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Acción inválida. Debe ser "approve" o "reject".' 
      }, { status: 400 });
    }

    const application = await LeaseApplication.findById(params.id);
    if (!application) {
      return NextResponse.json({ 
        error: 'Solicitud no encontrada.' 
      }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Solo se pueden modificar solicitudes pendientes.' 
      }, { status: 400 });
    }

    if (action === 'approve') {
      if (!leaseProvider) {
        return NextResponse.json({ 
          error: 'Proveedor de arrendamiento requerido para aprobar.' 
        }, { status: 400 });
      }
      await application.approve(leaseProvider, adminComments);
    } else {
      if (!adminComments) {
        return NextResponse.json({ 
          error: 'Comentarios requeridos para rechazar solicitud.' 
        }, { status: 400 });
      }
      await application.reject(adminComments);
    }

    // Poblar datos para respuesta
    await application.populate([
      { path: 'product', select: 'name brand price images' },
      { path: 'user', select: 'name email' },
      { path: 'distributor', select: 'name email' }
    ]);

    return NextResponse.json({
      message: `Solicitud ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente.`,
      application
    });

  } catch (error) {
    console.error('Error actualizando solicitud de arrendamiento:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    const application = await LeaseApplication.findById(params.id)
      .populate([
        { path: 'product', select: 'name brand price images description' },
        { path: 'user', select: 'name email role' },
        { path: 'distributor', select: 'name email' }
      ]);

    if (!application) {
      return NextResponse.json({ 
        error: 'Solicitud no encontrada.' 
      }, { status: 404 });
    }

    // Verificar permisos para ver la solicitud
    const canView = user.role === 'admin' || 
                    application.userId.toString() === user._id.toString() ||
                    application.distributorId.toString() === user._id.toString();

    if (!canView) {
      return NextResponse.json({ 
        error: 'No tienes permisos para ver esta solicitud.' 
      }, { status: 403 });
    }

    return NextResponse.json({ application });

  } catch (error) {
    console.error('Error obteniendo solicitud de arrendamiento:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

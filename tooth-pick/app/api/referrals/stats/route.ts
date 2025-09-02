import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { RewardService } from '@/lib/services/RewardService';

export async function GET(req: NextRequest) {
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

    // Obtener estadísticas de referidos
    const stats = await RewardService.getReferralStats(user._id.toString());

    return NextResponse.json({
      referralCode: user.referralCode,
      stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de referidos:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

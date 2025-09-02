import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import VerificationService from '@/lib/services/VerificationService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Solo proveedores y distribuidores pueden solicitar verificación
    if (!['provider', 'distributor'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Solo proveedores y distribuidores pueden solicitar verificación' },
        { status: 403 }
      );
    }
    
    // Obtener datos del formulario
    const formData = await request.formData();
    
    // Extraer datos de la empresa
    const submissionData = {
      companyType: formData.get('companyType') as 'persona_fisica' | 'persona_moral',
      businessName: formData.get('businessName') as string,
      legalName: formData.get('legalName') as string,
      rfc: formData.get('rfc') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: {
        street: formData.get('address.street') as string,
        city: formData.get('address.city') as string,
        state: formData.get('address.state') as string,
        zipCode: formData.get('address.zipCode') as string,
        country: formData.get('address.country') as string || 'México'
      },
      businessCategory: formData.get('businessCategory') as 'dental_supplies' | 'equipment' | 'technology' | 'services' | 'other',
      businessJustification: formData.get('businessJustification') as string || undefined,
      yearsInBusiness: formData.get('yearsInBusiness') ? parseInt(formData.get('yearsInBusiness') as string) : undefined,
      estimatedMonthlyVolume: formData.get('estimatedMonthlyVolume') as string || undefined
    };
    
    // Validar datos requeridos
    const requiredFields = ['companyType', 'businessName', 'legalName', 'rfc', 'phone', 'email', 'businessCategory'];
    const missingFields = requiredFields.filter(field => !formData.get(field));
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Campos requeridos faltantes: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Extraer archivos
    const files = {
      ineFront: formData.get('ineFront') as File,
      ineBack: formData.get('ineBack') as File,
      rfc: formData.get('rfc') as File,
      constitutiveAct: formData.get('constitutiveAct') as File || undefined,
      addressProof: formData.get('addressProof') as File,
      additionalDocs: formData.getAll('additionalDocs') as File[] || undefined
    };
    
    // Validar archivos requeridos
    const requiredFiles = ['ineFront', 'ineBack', 'rfc', 'addressProof'];
    const missingFiles = requiredFiles.filter(field => !files[field as keyof typeof files]);
    
    if (missingFiles.length > 0) {
      return NextResponse.json(
        { error: `Archivos requeridos faltantes: ${missingFiles.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Para personas morales, el acta constitutiva es requerida
    if (submissionData.companyType === 'persona_moral' && !files.constitutiveAct) {
      return NextResponse.json(
        { error: 'El acta constitutiva es requerida para personas morales' },
        { status: 400 }
      );
    }
    
    // Obtener metadata de la request
    const metadata = {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };
    
    // Enviar solicitud de verificación
    const result = await VerificationService.submitVerificationRequest(
      session.user.id,
      submissionData,
      files,
      metadata
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Solicitud de verificación enviada exitosamente',
      requestId: result.requestId
    });
    
  } catch (error) {
    console.error('Error submitting verification request:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Obtener estado de verificación
    const status = await VerificationService.getVerificationStatus(session.user.id);
    
    return NextResponse.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('Error getting verification status:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

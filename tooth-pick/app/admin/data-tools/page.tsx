// ToothPick - FASE 40.2 - Panel de Herramientas de Datos (Exportaciones y Respaldos)

// Protección y funciones finales para el panel de backups y exportaciones
'use client';

'use client';
import { useEffect, useState } from 'react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { useTranslations } from '@/hooks/useTranslations';

type BackupLog = {
  _id: string;
  filePath: string;
  createdAt: string;
};

type ExportLog = {
  _id: string;
  filePath: string;
  createdAt: string;
  format: string;
  collections: string[];
};

export default function DataToolsPage() {
  const { data: session, status } = useSession();
  const isAdmin = useIsAdmin();
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [exports, setExports] = useState<ExportLog[]>([]);
  const { t } = useTranslations();

  useEffect(() => {
    if (status === 'loading') return;
    if (!isAdmin) redirect('/unauthorized');

    fetch('/api/backups')
      .then((res) => res.json())
      .then(setBackups)
      .catch(console.error);

    fetch('/api/exports')
      .then((res) => res.json())
      .then(setExports)
      .catch(console.error);
  }, [isAdmin, status]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t('data_tools_title')}</h1>

      {/* Sección de Respaldos */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">{t('backups')}</h2>
        <ul className="space-y-2">
          {backups.map((b) => (
            <li key={b._id} className="flex justify-between bg-gray-100 p-2 rounded">
              <span>{format(new Date(b.createdAt), 'dd/MM/yyyy HH:mm')}</span>
              <a
                href={`/api/download/${encodeURIComponent(b.filePath.split('/').pop() ?? '')}`}
                download
                className="text-blue-600 hover:underline"
              >
                {t('download')}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Sección de Exportaciones */}
      <section>
        <h2 className="text-xl font-semibold mb-2">{t('exports')}</h2>
        <ul className="space-y-2">
          {exports.map((e) => (
            <li key={e._id} className="flex justify-between bg-gray-100 p-2 rounded">
              <div>
                <div>{format(new Date(e.createdAt), 'dd/MM/yyyy HH:mm')}</div>
                <div className="text-sm text-gray-600">
                  {e.format.toUpperCase()} | {e.collections.join(', ')}
                </div>
              </div>
              <a
                href={`/api/download/${encodeURIComponent(e.filePath.split('/').pop() ?? '')}`}
                download
                className="text-blue-600 hover:underline"
              >
                {t('download')}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Colecciones</th>
              <th className="p-2 text-left">Formato</th>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Descargar</th>
            </tr>
          </thead>
          <tbody>
            {exports.map((e) => (
              <tr key={e._id} className="border-t">
                <td className="p-2">{e._id}</td>
                <td className="p-2">{e.collections.join(', ')}</td>
                <td className="p-2 uppercase">{e.format}</td>
                <td className="p-2">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="p-2">
                  {e.filePath ? (
                    <a
                      href={`/backups/${e.filePath.split('/').pop()}`}
                      download
                      className="text-blue-600 underline"
                    >
                      Descargar
                    </a>
                  ) : (
                    <span className="text-red-500">No disponible</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

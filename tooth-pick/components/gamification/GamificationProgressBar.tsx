'use client';

import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Star, Zap } from 'lucide-react';

interface GamificationProgressBarProps {
  currentLevel: number;
  levelTitle: string;
  currentXP: number;
  requiredXP: number;
  percentage: number;
  animated?: boolean;
  showNextLevel?: boolean;
}

export default function GamificationProgressBar({
  currentLevel,
  levelTitle,
  currentXP,
  requiredXP,
  percentage,
  animated = true,
  showNextLevel = true
}: GamificationProgressBarProps) {
  const nextLevel = currentLevel + 1;
  const nextLevelTitle = getLevelTitle(nextLevel);

  return (
    <div className="space-y-4">
      {/* Nivel actual */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-lg shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {currentLevel}
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold">{levelTitle}</h3>
            <p className="text-sm text-muted-foreground">Nivel {currentLevel}</p>
          </div>
        </div>
        
        {showNextLevel && (
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4" />
              Siguiente: {nextLevelTitle}
            </div>
            <p className="text-xs text-muted-foreground">Nivel {nextLevel}</p>
          </div>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Experiencia</span>
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">
              {currentXP.toLocaleString()} / {requiredXP.toLocaleString()} XP
            </span>
          </div>
        </div>
        
        <div className="relative">
          <Progress value={percentage} className="h-3" />
          
          {/* Animación de partículas cuando está cerca del siguiente nivel */}
          {percentage > 80 && animated && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '50%',
                  }}
                  animate={{
                    y: [-5, -15, -5],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3
                  }}
                />
              ))}
            </motion.div>
          )}
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{percentage.toFixed(1)}% completado</span>
          <span>{(requiredXP - currentXP).toLocaleString()} XP restante</span>
        </div>
      </div>

      {/* Próximas recompensas */}
      {percentage > 50 && showNextLevel && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700">
              ¡Próximo nivel!
            </span>
          </div>
          <p className="text-xs text-blue-600">
            Al alcanzar el nivel {nextLevel}, desbloquearás nuevas características
            y podrás ganar más puntos por tus actividades.
          </p>
        </motion.div>
      )}
    </div>
  );
}

// Función auxiliar para obtener títulos de nivel
function getLevelTitle(level: number): string {
  if (level <= 5) return 'Principiante';
  if (level <= 10) return 'Explorador';
  if (level <= 20) return 'Aventurero';
  if (level <= 35) return 'Experto';
  if (level <= 50) return 'Maestro';
  if (level <= 75) return 'Veterano';
  if (level <= 100) return 'Leyenda';
  return 'Inmortal';
}

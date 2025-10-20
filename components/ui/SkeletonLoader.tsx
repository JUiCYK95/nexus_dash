'use client'

import { motion } from 'framer-motion'

interface SkeletonLoaderProps {
  variant?: 'card' | 'stat' | 'chart' | 'list' | 'text'
  count?: number
}

export default function SkeletonLoader({ variant = 'card', count = 1 }: SkeletonLoaderProps) {
  const shimmer = {
    hidden: { x: '-100%' },
    visible: {
      x: '100%',
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: 'linear'
      }
    }
  }

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.4 }
    }
  }

  const StatSkeleton = () => (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="relative bg-white dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-24 relative overflow-hidden">
            <motion.div
              variants={shimmer}
              initial="hidden"
              animate="visible"
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
            />
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 relative overflow-hidden">
            <motion.div
              variants={shimmer}
              initial="hidden"
              animate="visible"
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
            />
          </div>
        </div>
        <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="hidden"
            animate="visible"
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
          />
        </div>
      </div>
    </motion.div>
  )

  const ChartSkeleton = () => (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="relative bg-white dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 overflow-hidden"
    >
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-40 relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="hidden"
            animate="visible"
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
          />
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl relative overflow-hidden">
          <motion.div
            variants={shimmer}
            initial="hidden"
            animate="visible"
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
          />
        </div>
      </div>
    </motion.div>
  )

  const ListSkeleton = () => (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full relative overflow-hidden flex-shrink-0">
            <motion.div
              variants={shimmer}
              initial="hidden"
              animate="visible"
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
            />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 relative overflow-hidden">
              <motion.div
                variants={shimmer}
                initial="hidden"
                animate="visible"
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
              />
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2 relative overflow-hidden">
              <motion.div
                variants={shimmer}
                initial="hidden"
                animate="visible"
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
              />
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  )

  const TextSkeleton = () => {
    // Predefined widths to avoid hydration mismatch
    const predefinedWidths = ['85%', '92%', '78%', '88%', '95%', '82%', '90%', '75%']

    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        {[...Array(count)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden" style={{ width: predefinedWidths[i % predefinedWidths.length] }}>
            <motion.div
              variants={shimmer}
              initial="hidden"
              animate="visible"
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
            />
          </div>
        ))}
      </motion.div>
    )
  }

  const CardSkeleton = () => {
    // Predefined widths to avoid hydration mismatch
    const cardWidths = ['92%', '85%', '88%']

    return (
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="relative bg-white dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 overflow-hidden"
      >
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3 relative overflow-hidden">
            <motion.div
              variants={shimmer}
              initial="hidden"
              animate="visible"
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
            />
          </div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg relative overflow-hidden" style={{ width: cardWidths[i % cardWidths.length] }}>
                <motion.div
                  variants={shimmer}
                  initial="hidden"
                  animate="visible"
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
                />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    )
  }

  const renderSkeleton = () => {
    switch (variant) {
      case 'stat':
        return <StatSkeleton />
      case 'chart':
        return <ChartSkeleton />
      case 'list':
        return <ListSkeleton />
      case 'text':
        return <TextSkeleton />
      case 'card':
      default:
        return <CardSkeleton />
    }
  }

  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </>
  )
}

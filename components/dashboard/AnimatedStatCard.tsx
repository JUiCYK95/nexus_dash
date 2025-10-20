'use client'

import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { useInView } from 'react-intersection-observer'
import Tilt from 'react-parallax-tilt'

interface AnimatedStatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  gradient: string
  suffix?: string
  decimals?: number
  index: number
}

export default function AnimatedStatCard({
  title,
  value,
  icon,
  gradient,
  suffix = '',
  decimals = 0,
  index
}: AnimatedStatCardProps) {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  })

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  }

  return (
    <Tilt
      tiltMaxAngleX={5}
      tiltMaxAngleY={5}
      perspective={1000}
      scale={1.02}
      transitionSpeed={2000}
      gyroscope={true}
    >
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="relative group"
      >
        {/* Gradient Border with Glow */}
        <div className={`absolute -inset-0.5 bg-gradient-to-r ${gradient} rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:blur-md`}></div>

        {/* Card Content */}
        <div className="relative bg-white dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">{title}</p>
            <div className="flex items-baseline space-x-1">
              {inView && (
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.1 + 0.3,
                    type: "spring",
                    bounce: 0.4
                  }}
                >
                  <p className="text-gray-900 dark:text-white text-3xl font-bold">
                    <CountUp
                      start={0}
                      end={value}
                      duration={2.5}
                      delay={index * 0.1}
                      decimals={decimals}
                      separator="."
                      suffix={suffix}
                    />
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Animated Icon Container */}
          <motion.div
            className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
            whileHover={{
              rotate: [0, -10, 10, -10, 0],
              scale: 1.1,
              transition: { duration: 0.5 }
            }}
          >
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300`}></div>

            {/* Icon */}
            <div className="relative text-white">
              {icon}
            </div>
          </motion.div>
        </div>

        {/* Shimmer Effect on Hover */}
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          <motion.div
            className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-10`}
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.div>
      </div>
    </motion.div>
    </Tilt>
  )
}

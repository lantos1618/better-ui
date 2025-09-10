import React, { createElement, forwardRef, memo, type ElementType } from 'react';
import { motion, type MotionProps } from 'framer-motion';
import { useMoves } from './MoveContext';

type CustomMotionProps<T extends ElementType> = MotionProps &
  React.ComponentPropsWithRef<T> & {
    prevTag?: string;
  };

export const CustomMotion = memo(
  forwardRef<HTMLDivElement, CustomMotionProps<any>>((props, ref) => {
    const htmlTag =
      props['data-magicpath-motion-tag']?.split('.')[1] || props['prevTag']?.split('.')[1];
    const MotionComponent = motion[htmlTag];

    const { isEditMode } = useMoves();

    if (isEditMode) {
      const {
        initial,
        animate,
        variants,
        transition,
        whileHover,
        whileTap,
        viewport,
        children,
        whileInView,
        prevTag,
        ...nonMotionProps
      } = props;

      return createElement(
        htmlTag,
        {
          ref,
          ...nonMotionProps,
        },
        props.children
      );
    }

    return (
      <MotionComponent ref={ref} {...props}>
        {props.children}
      </MotionComponent>
    );
  })
);

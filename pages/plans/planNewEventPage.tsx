import { NextPage } from 'next';
import { Box, Typography, TextField, Button, Paper, ToggleButton, IconButton, Switch, FormControlLabel } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { useForm, Controller } from 'react-hook-form';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FooterMenu from '../../components/FooterMenu';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ja';
import { useState, useRef, useCallback, useEffect } from 'react';

// フォームの型定義
type PlanFormData = {
  title: string;
  description: string;
};

type DateTimeSelection = {
  id: string;
  date: Dayjs;
  time: string;
};

const PlanNewEventPage: NextPage = () => {
  const [selectedDateTimes, setSelectedDateTimes] = useState<DateTimeSelection[]>([]);
  const [isBulkTimeEdit, setIsBulkTimeEdit] = useState(false);
  
  // スクロール位置を監視するための参照を追加
  const timeScrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const timeButtonRefs = useRef<{ [key: string]: { [key: string]: HTMLElement | null } }>({});
  const [isScrolling, setIsScrolling] = useState(false);

  // フォームの初期値
  const defaultValues: PlanFormData = {
    title: '',
    description: '',
  };

  const { control, handleSubmit } = useForm<PlanFormData>({
    defaultValues,
  });

  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleDateSelect = (date: Dayjs | null) => {
    if (!date) return;
    
    const formattedDate = date.startOf('day');
    const dateExists = selectedDateTimes.some(dt => dt.date.isSame(formattedDate, 'day'));

    if (dateExists) {
      setSelectedDateTimes(prevTimes => prevTimes.filter(dt => !dt.date.isSame(formattedDate, 'day')));
    } else {
      const newId = generateUniqueId();
      setSelectedDateTimes(prevTimes => [...prevTimes, { id: newId, date: formattedDate, time: '12:00' }]);
    }
  };

  const handleTimeChange = (dateTime: DateTimeSelection, newTime: string) => {
    setSelectedDateTimes(prevTimes => {
      if (isBulkTimeEdit) {
        // 一括編集モードの場合、全ての日付の時間を更新
        return prevTimes.map(dt => ({ ...dt, time: newTime }));
      } else {
        // 個別編集モードの場合、選択された日付の時間のみ更新
        return prevTimes.map(dt => dt.id === dateTime.id ? { ...dt, time: newTime } : dt);
      }
    });
  };

  const handleRemoveDateTime = (id: string) => {
    setSelectedDateTimes(prevTimes => {
      const newTimes = prevTimes.filter(dt => dt.id !== id);
      // 削除後、残っているイベントがある場合は最後のイベントにフォーカス
      if (newTimes.length > 0) {
        const lastDateTime = newTimes[newTimes.length - 1];
        setTimeout(() => {
          const scrollRef = timeScrollRefs.current[lastDateTime.id];
          const targetElement = timeButtonRefs.current[lastDateTime.id]?.[lastDateTime.time];
          if (scrollRef && targetElement) {
            const containerRect = scrollRef.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();
            const scrollOffset = targetRect.left - containerRect.left - (containerRect.width / 2) + (targetRect.width / 2);
            scrollRef.scrollTo({ left: scrollRef.scrollLeft + scrollOffset, behavior: 'smooth' });
          }
        }, 0);
      }
      return newTimes;
    });
  };

  // スクロール終了を検知する関数
  const handleScrollEnd = useCallback((dateTime: DateTimeSelection) => {
    if (isBulkTimeEdit) {
      const scrollRef = timeScrollRefs.current['bulk'];
      const buttonRefs = timeButtonRefs.current['bulk'];
      if (!scrollRef || !buttonRefs) return;

      const containerRect = scrollRef.getBoundingClientRect();
      const containerCenter = containerRect.left + (containerRect.width / 2);

      let closestTime = selectedDateTimes[0]?.time || '12:00';
      let minDistance = Infinity;

      Object.entries(buttonRefs).forEach(([time, element]) => {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const buttonCenter = rect.left + (rect.width / 2);
        const distance = Math.abs(buttonCenter - containerCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestTime = time;
        }
      });

      if (closestTime !== selectedDateTimes[0]?.time) {
        handleTimeChange(dateTime, closestTime);
      }
    } else {
      const scrollRef = timeScrollRefs.current[dateTime.id];
      const buttonRefs = timeButtonRefs.current[dateTime.id];
      if (!scrollRef || !buttonRefs) return;

      const containerRect = scrollRef.getBoundingClientRect();
      const containerCenter = containerRect.left + (containerRect.width / 2);

      let closestTime = dateTime.time;
      let minDistance = Infinity;

      Object.entries(buttonRefs).forEach(([time, element]) => {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const buttonCenter = rect.left + (rect.width / 2);
        const distance = Math.abs(buttonCenter - containerCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestTime = time;
        }
      });

      if (closestTime !== dateTime.time) {
        handleTimeChange(dateTime, closestTime);
      }
    }
  }, [isBulkTimeEdit, selectedDateTimes]);

  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    // 一括設定モードのスクロールハンドラー
    if (isBulkTimeEdit) {
      const scrollRef = timeScrollRefs.current['bulk'];
      if (scrollRef) {
        let scrollTimeout: NodeJS.Timeout;

        const handleScroll = () => {
          setIsScrolling(true);
          clearTimeout(scrollTimeout);

          scrollTimeout = setTimeout(() => {
            setIsScrolling(false);
            handleScrollEnd({ id: 'bulk', date: selectedDateTimes[0]?.date, time: selectedDateTimes[0]?.time });
          }, 150);
        };

        scrollRef.addEventListener('scroll', handleScroll);
        cleanupFunctions.push(() => {
          scrollRef.removeEventListener('scroll', handleScroll);
          clearTimeout(scrollTimeout);
        });
      }
    }

    // 個別の時間選択のスクロールハンドラー
    selectedDateTimes.forEach(dateTime => {
      if (isBulkTimeEdit) return;

      const scrollRef = timeScrollRefs.current[dateTime.id];
      if (!scrollRef) return;

      let scrollTimeout: NodeJS.Timeout;

      const handleScroll = () => {
        setIsScrolling(true);
        clearTimeout(scrollTimeout);

        scrollTimeout = setTimeout(() => {
          setIsScrolling(false);
          handleScrollEnd(dateTime);
        }, 150);
      };

      scrollRef.addEventListener('scroll', handleScroll);
      cleanupFunctions.push(() => {
        scrollRef.removeEventListener('scroll', handleScroll);
        clearTimeout(scrollTimeout);
      });
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [handleScrollEnd, selectedDateTimes, isBulkTimeEdit]);

  // モード切り替え時のスクロール位置リセット
  useEffect(() => {
    if (isBulkTimeEdit) {
      // 一括設定モードに切り替わった時
      const scrollRef = timeScrollRefs.current['bulk'];
      const targetElement = timeButtonRefs.current['bulk']?.[selectedDateTimes[0]?.time || '12:00'];
      if (scrollRef && targetElement) {
        const containerRect = scrollRef.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const scrollOffset = targetRect.left - containerRect.left - (containerRect.width / 2) + (targetRect.width / 2);
        scrollRef.scrollTo({ left: scrollRef.scrollLeft + scrollOffset, behavior: 'smooth' });
      }
    } else {
      // 個別設定モードに切り替わった時
      selectedDateTimes.forEach(dateTime => {
        const scrollRef = timeScrollRefs.current[dateTime.id];
        const targetElement = timeButtonRefs.current[dateTime.id]?.[dateTime.time];
        if (scrollRef && targetElement) {
          const containerRect = scrollRef.getBoundingClientRect();
          const targetRect = targetElement.getBoundingClientRect();
          const scrollOffset = targetRect.left - containerRect.left - (containerRect.width / 2) + (targetRect.width / 2);
          scrollRef.scrollTo({ left: scrollRef.scrollLeft + scrollOffset, behavior: 'smooth' });
        }
      });
    }
  }, [isBulkTimeEdit, selectedDateTimes]);

  const onSubmit = (data: PlanFormData) => {
    const eventData = {
      ...data,
      dates: selectedDateTimes.map(dt => ({
        datetime: dt.date.hour(parseInt(dt.time.split(':')[0]))
                      .minute(parseInt(dt.time.split(':')[1]))
      }))
    };
    console.log(eventData);
    // TODO: APIを呼び出して保存処理を実装
  };

  // 時間選択オプション
  const timeOptions = Array.from({ length: 97 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <Box 
        sx={{ 
          minHeight: '100vh',
          color: '#FCFCFC',
        }}
      >
        <Box 
          component="form" 
          onSubmit={handleSubmit(onSubmit)}
          sx={{ 
            pb: 'calc(64px + 20px)',
            px: 1.5,
            maxWidth: '600px',
            mx: 'auto'
          }}
        >
          <Typography 
            variant="subtitle1" 
            component="h1" 
            sx={{ 
              py: 1.5,
              fontWeight: 'bold',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              mb: 2,
              fontSize: '1rem'
            }}
          >
            予定調整
          </Typography>

          <Paper 
            elevation={0} 
            sx={{ 
              p: 1.5, 
              mb: 2,
              bgcolor: '#2D2D2D',
              borderRadius: '8px'
            }}
          >
            <Controller
              name="title"
              control={control}
              rules={{ required: 'タイトルは必須です' }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="タイトル"
                  fullWidth
                  error={!!error}
                  helperText={error?.message}
                  size="small"
                  sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      color: '#FCFCFC',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#8E93DA',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#8E93DA',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#8E93DA',
                      },
                      fontSize: '0.875rem',
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#f44336',
                      marginTop: 0.5,
                      fontSize: '0.75rem',
                    },
                  }}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="備考"
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      color: '#FCFCFC',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#8E93DA',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#8E93DA',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#8E93DA',
                      },
                      fontSize: '0.875rem',
                    },
                  }}
                />
              )}
            />

            <Box sx={{ 
              bgcolor: '#262626',
              borderRadius: 1,
              p: 1.5,
            }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: 'medium',
                  fontSize: '0.875rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>候補日（複数選択可）</span>
                {selectedDateTimes.length > 0 && (
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.75rem',
                      color: '#8E93DA',
                      bgcolor: 'rgba(142, 147, 218, 0.1)',
                      padding: '2px 2px',
                      borderRadius: '12px',
                    }}
                  >
                    {selectedDateTimes.length}日選択中
                  </Typography>
                )}
            </Typography>

              <DateCalendar 
                value={null}
                onChange={handleDateSelect}
                sx={{
                  width: '100%',
                  '& .MuiPickersCalendarHeader-root': {
                    paddingLeft: 1,
                    paddingRight: 1,
                    marginTop: 0,
                    marginBottom: 1,
                    '& .MuiPickersArrowSwitcher-root': {
                      '& .MuiIconButton-root': {
                        color: '#FCFCFC',
                      },
                    },
                  },
                  '& .MuiDayCalendar-header, & .MuiDayCalendar-weekContainer': {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    justifyContent: 'center',
                  },
                  '& .MuiDayCalendar-weekContainer': {
                    margin: 0,
                  },
                  '& .MuiPickersDay-root': {
                    color: '#FCFCFC',
                    width: 36,
                    height: 36,
                    fontSize: '0.875rem',
                    margin: '0 auto',
                    '&.Mui-selected': {
                      bgcolor: '#5b63d3',
                      '&:hover': {
                        bgcolor: '#4850c9',
                      },
                    },
                    '&:hover': {
                      bgcolor: 'rgba(142, 147, 218, 0.04)',
                    },
                  },
                  '& .MuiDayCalendar-weekDayLabel': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    width: 36,
                    height: 36,
                    margin: '0 auto',
                    fontSize: '0.75rem',
                  },
                  '& .MuiPickersCalendarHeader-label': {
                    color: '#FCFCFC',
                    fontSize: '0.875rem',
                  },
                  '& .MuiPickersCalendarHeader-switchViewButton': {
                    color: '#FCFCFC',
                    width: 32,
                    height: 32,
                  },
                  '& .MuiPickersCalendarHeader-switchViewIcon': {
                    fontSize: '1.25rem',
                    color: '#FCFCFC',
                  },
                  '& .MuiPickersDay-today': {
                    borderColor: '#8E93DA',
                  },
                  '& .MuiDayCalendar-monthContainer': {
                    marginBottom: 0,
                  },
                }}
                slots={{
                  day: (props: { day: Dayjs | null }) => {
                    if (!props.day) return null;
                    const isSelected = selectedDateTimes.some(dt => 
                      dt.date.isSame(props.day, 'day')
                    );
                    return (
                      <Box
                        onClick={() => handleDateSelect(props.day)}
                      sx={{ 
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          borderRadius: '50%',
                          bgcolor: isSelected ? '#5b63d3' : 'transparent',
                          color: '#FCFCFC',
                          fontSize: '0.875rem',
                          margin: '0 auto',
                          '&:hover': {
                            bgcolor: isSelected ? '#4850c9' : 'rgba(142, 147, 218, 0.04)',
                          },
                        }}
                      >
                        {props.day.date()}
                      </Box>
                    );
                  },
                }}
              />

              {selectedDateTimes.length > 0 && (
                <Box sx={{ 
                  mt: 1.5,
                  pt: 1.5,
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}>
                      <AccessTimeIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1rem' }} />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.875rem',
                        }}
                      >
                        開始時間を選択
                      </Typography>
                    </Box>
                    <Box
                      onClick={() => setIsBulkTimeEdit(!isBulkTimeEdit)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        bgcolor: isBulkTimeEdit ? '#5b63d3' : '#37373F',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: isBulkTimeEdit ? '#4850c9' : '#404049',
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.75rem',
                          color: isBulkTimeEdit ? '#FCFCFC' : 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        一括設定
                      </Typography>
                      <Box
                        sx={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          bgcolor: isBulkTimeEdit ? '#FCFCFC' : 'rgba(255, 255, 255, 0.3)',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    </Box>
                  </Box>

                  {isBulkTimeEdit && (
                    <Box sx={{
                      position: 'relative',
                      height: '40px',
                      mb: 2,
                      bgcolor: '#1D1D21',
                      '&::before, &::after': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: '40%',
                        pointerEvents: 'none',
                        zIndex: 1,
                      },
                      '&::before': {
                        top: 0,
                        background: 'linear-gradient(to bottom, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)',
                      },
                      '&::after': {
                        bottom: 0,
                        background: 'linear-gradient(to top, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)',
                      },
                    }}>
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          width: '72px',
                          height: '32px',
                          transform: 'translate(-50%, -50%)',
                          border: '2px solid #5b63d3',
                          borderRadius: '4px',
                          pointerEvents: 'none',
                          zIndex: 2,
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: 0,
                          width: '25%',
                          background: 'linear-gradient(to right, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)',
                          pointerEvents: 'none',
                          zIndex: 2,
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          right: 0,
                          width: '25%',
                          background: 'linear-gradient(to left, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)',
                          pointerEvents: 'none',
                          zIndex: 2,
                        }}
                      />
                      <Box 
                        ref={(el: HTMLDivElement | null) => {
                          if (el) {
                            timeScrollRefs.current['bulk'] = el;
                          } else {
                            delete timeScrollRefs.current['bulk'];
                          }
                        }}
                        sx={{ 
                          position: 'relative',
                          display: 'flex',
                          gap: 2,
                          height: '100%',
                          overflowX: 'auto',
                          overflowY: 'hidden',
                          scrollSnapType: 'x proximity',
                          WebkitOverflowScrolling: 'touch',
                          scrollBehavior: 'smooth',
                          msOverflowStyle: 'none',
                          scrollbarWidth: 'none',
                          '&::-webkit-scrollbar': {
                            display: 'none'
                          },
                        }}
                      >
                        <Box sx={{ 
                          flex: '0 0 calc(50% - 36px)', 
                          minWidth: 'calc(50% - 36px)',
                        }} />
                        {timeOptions.map((time) => (
                          <Box
                            key={time}
                            ref={(el: HTMLDivElement | null) => {
                              if (el) {
                                if (!timeButtonRefs.current['bulk']) {
                                  timeButtonRefs.current['bulk'] = {};
                                }
                                timeButtonRefs.current['bulk'][time] = el;
                              } else if (timeButtonRefs.current['bulk']) {
                                delete timeButtonRefs.current['bulk'][time];
                              }
                            }}
                            onClick={() => {
                              setSelectedDateTimes(prevTimes => 
                                prevTimes.map(dt => ({ ...dt, time }))
                              );
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '72px',
                              height: '100%',
                              color: selectedDateTimes[0]?.time === time ? '#FCFCFC' : 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem',
                              fontWeight: 'bold',
                              scrollSnapAlign: 'center',
                              scrollSnapStop: 'normal',
                              transition: isScrolling ? 'none' : 'all 0.2s ease',
                              opacity: selectedDateTimes[0]?.time === time ? 1 : 0.7,
                              userSelect: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {time}
                          </Box>
                        ))}
                        <Box sx={{ 
                          flex: '0 0 calc(50% - 36px)', 
                          minWidth: 'calc(50% - 36px)',
                        }} />
                      </Box>
                    </Box>
                  )}

                  {selectedDateTimes
                    .sort((a, b) => a.date.valueOf() - b.date.valueOf())
                    .map((dateTime) => (
                      <Box 
                        key={dateTime.id}
                        sx={{
                          mb: 1,
                          p: 1,
                          bgcolor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                        }}
                      >
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: isBulkTimeEdit ? 0 : 0.5,
                        }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.875rem',
                              color: '#FCFCFC',
                            }}
                          >
                            {dateTime.date.format('M月D日')}
                            {selectedDateTimes.filter(dt => dt.date.isSame(dateTime.date, 'day')).length > 1 && 
                              ` (${selectedDateTimes.filter(dt => dt.date.isSame(dateTime.date, 'day'))
                                .findIndex(dt => dt.id === dateTime.id) + 1})`
                            }
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {!isBulkTimeEdit && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const newDateTime = { 
                                    id: generateUniqueId(),
                                    date: dayjs(dateTime.date),
                                    time: selectedDateTimes[0]?.time || '12:00'
                                  };
                                  setSelectedDateTimes(prevTimes => [...prevTimes, newDateTime]);
                                }}
                                sx={{
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  padding: 0.5,
                                  '&:hover': {
                                    color: '#FCFCFC',
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                  },
                                }}
                              >
                                <AddIcon sx={{ fontSize: '1.25rem' }} />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveDateTime(dateTime.id)}
                              sx={{
                                color: 'rgba(255, 255, 255, 0.5)',
                                padding: 0.5,
                                '&:hover': {
                                  color: '#FCFCFC',
                                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                                },
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: '1.25rem' }} />
                            </IconButton>
                          </Box>
                        </Box>
                        {!isBulkTimeEdit && (
                          <Box sx={{
                            position: 'relative',
                            height: '40px',
                            mb: 1,
                            bgcolor: '#1D1D21',
                            '&::before, &::after': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              height: '40%',
                              pointerEvents: 'none',
                              zIndex: 1,
                            },
                            '&::before': {
                              top: 0,
                              background: 'linear-gradient(to bottom, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)',
                            },
                            '&::after': {
                              bottom: 0,
                              background: 'linear-gradient(to top, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)',
                            },
                          }}>
                            <Box
                              sx={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: '72px',
                                height: '32px',
                                transform: 'translate(-50%, -50%)',
                                border: '2px solid #5b63d3',
                                borderRadius: '4px',
                                pointerEvents: 'none',
                                zIndex: 2,
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: 0,
                                width: '25%',
                                background: 'linear-gradient(to right, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)',
                                pointerEvents: 'none',
                                zIndex: 2,
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                right: 0,
                                width: '25%',
                                background: 'linear-gradient(to left, rgba(29, 29, 33, 1) 0%, rgba(29, 29, 33, 0) 100%)',
                                pointerEvents: 'none',
                                zIndex: 2,
                              }}
                            />
                            <Box 
                              ref={(el: HTMLDivElement | null) => {
                                if (el) {
                                  timeScrollRefs.current[dateTime.id] = el;
                                } else {
                                  delete timeScrollRefs.current[dateTime.id];
                                }
                              }}
                              sx={{ 
                                position: 'relative',
                                display: 'flex',
                                gap: 2,
                                height: '100%',
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                scrollSnapType: 'x proximity',
                                WebkitOverflowScrolling: 'touch',
                                scrollBehavior: 'smooth',
                                msOverflowStyle: 'none',
                                scrollbarWidth: 'none',
                                '&::-webkit-scrollbar': {
                                  display: 'none'
                                },
                              }}
                            >
                              <Box sx={{ 
                                flex: '0 0 calc(50% - 36px)', 
                                minWidth: 'calc(50% - 36px)',
                              }} />
                              {timeOptions.map((time) => (
                                <Box
                                  key={time}
                                  ref={(el: HTMLDivElement | null) => {
                                    if (el) {
                                      if (!timeButtonRefs.current[dateTime.id]) {
                                        timeButtonRefs.current[dateTime.id] = {};
                                      }
                                      timeButtonRefs.current[dateTime.id][time] = el;
                                    } else if (timeButtonRefs.current[dateTime.id]) {
                                      delete timeButtonRefs.current[dateTime.id][time];
                                    }
                                  }}
                                  onClick={() => handleTimeChange(dateTime, time)}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '72px',
                                    height: '100%',
                                    color: dateTime.time === time ? '#FCFCFC' : 'rgba(255, 255, 255, 0.7)',
                                    fontSize: '0.875rem',
                                    fontWeight: 'bold',
                                    scrollSnapAlign: 'center',
                                    scrollSnapStop: 'normal',
                                    transition: isScrolling ? 'none' : 'all 0.2s ease',
                                    opacity: dateTime.time === time ? 1 : 0.7,
                                    userSelect: 'none',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {time}
                                </Box>
                              ))}
                              <Box sx={{ 
                                flex: '0 0 calc(50% - 36px)', 
                                minWidth: 'calc(50% - 36px)',
                              }} />
                            </Box>
                          </Box>
                        )}
                      </Box>
                    ))}
                </Box>
              )}
            </Box>
          </Paper>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={selectedDateTimes.length === 0}
            sx={{ 
              bgcolor: '#5b63d3',
              color: '#FCFCFC',
              py: 1,
              fontSize: '0.875rem',
              fontWeight: 'bold',
              '&:hover': {
                bgcolor: '#4850c9'
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(91, 99, 211, 0.3)',
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            作成する
          </Button>
        </Box>
        <FooterMenu />
      </Box>
    </LocalizationProvider>
  );
};

export default PlanNewEventPage; 
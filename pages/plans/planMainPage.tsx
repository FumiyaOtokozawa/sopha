import { NextPage } from 'next';
import { Box, Typography, Button, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import FooterMenu from '../../components/FooterMenu';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@supabase/auth-helpers-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

// 日程調整の型定義
interface PlanEvent {
  plan_id: number;
  plan_title: string;
  description: string | null;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  deadline: string;
  status: string;
  dates: {
    datetime: string;
  }[];
  creator: {
    name: string;  // 表示用に結合した名前
  };
  responses_count: number;
}

// Supabaseのレスポンスの型
interface RawPlanEvent {
  plan_id: number;
  plan_title: string;
  description: string | null;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  deadline: string;
  status: string;
  dates: {
    datetime: string;
  }[];
  creator: {
    myoji: string;
    namae: string;
  };
  responses_count: number;
}

// Supabaseクライアントをコンポーネントの外で初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PlanMainPage: NextPage = () => {
  const router = useRouter();
  const user = useUser();
  const [planEvents, setPlanEvents] = useState<PlanEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 受付中と締切済みのイベントを分類
  const { pendingEvents, recentClosedEvents } = useMemo(() => {
    const now = dayjs();
    const oneMonthAgo = now.subtract(1, 'month');

    return {
      pendingEvents: planEvents.filter(event => event.status === 'pending'),
      recentClosedEvents: planEvents.filter(event => 
        event.status === 'closed' && 
        dayjs(event.updated_at).isAfter(oneMonthAgo)
      ),
    };
  }, [planEvents]);

  useEffect(() => {
    const fetchPlanEvents = async () => {
      if (!user?.email) {
        console.log('User email not found');
        setIsLoading(false);
        return;
      }

      console.log('Fetching plan events for user:', user.email);

      try {
        // イベント情報を取得（クエリを修正）
        const { data: rawEvents, error } = await supabase
          .from('PLAN_EVENT')
          .select(`
            *,
            dates:PLAN_EVENT_DATES(datetime),
            creator:USER_INFO!created_by(myoji, namae),
            responses_count:PLAN_PAR_AVAILABILITY(count)
          `)
          .or('status.eq.pending,and(status.eq.closed,updated_at.gt.' + dayjs().subtract(1, 'month').toISOString() + ')')
          .order('status', { ascending: true })
          .order('deadline', { ascending: true });

        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }

        console.log('Raw events from Supabase:', rawEvents);

        // レスポンスを適切な型に変換
        const formattedEvents: PlanEvent[] = (rawEvents as RawPlanEvent[]).map(event => ({
          ...event,
          creator: {
            name: `${event.creator.myoji} ${event.creator.namae}`
          },
          responses_count: event.responses_count || 0
        }));

        console.log('Formatted events:', formattedEvents);

        setPlanEvents(formattedEvents);
      } catch (error) {
        console.error('Error fetching plan events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlanEvents();
  }, [user?.email]);

  const handleCreateNewPlan = () => {
    router.push('/plans/planNewEventPage');
  };

  const handlePlanClick = (planId: number) => {
    router.push(`/plans/${planId}`);
  };

  return (
    <Box 
      className="plan-main-container"
      sx={{ 
        minHeight: '100vh',
        color: '#FCFCFC',
        pb: 'calc(64px + 20px)',
      }}
    >
      <Box 
        className="plan-main-content"
        sx={{ 
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
          日程調整
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
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateNewPlan}
              sx={{ 
                bgcolor: '#5b63d3',
                color: '#FCFCFC',
                py: 1,
                px: 3,
                fontSize: '0.875rem',
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: '#4850c9'
                },
              }}
            >
              新規イベントの日程調整
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            {isLoading ? (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  textAlign: 'center',
                  fontSize: '0.875rem'
                }}
              >
                読み込み中...
              </Typography>
            ) : pendingEvents.length > 0 || recentClosedEvents.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {pendingEvents.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontSize: '0.875rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontWeight: '500',
                        pl: 0.5,
                      }}
                    >
                      受付中のイベント
                    </Typography>
                    {pendingEvents.map((event) => (
                      <Paper
                        key={event.plan_id}
                        onClick={() => handlePlanClick(event.plan_id)}
                        sx={{
                          bgcolor: event.status === 'pending' 
                            ? 'transparent'
                            : '#1D1D21',
                          background: event.status === 'pending'
                            ? 'linear-gradient(135deg, #1D1D21 0%, #252941 100%)'
                            : '#1D1D21',
                          p: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.5,
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: event.status === 'pending'
                            ? 'rgba(142, 147, 218, 0.1)'
                            : 'rgba(255, 255, 255, 0.05)',
                          '&:hover': {
                            background: event.status === 'pending'
                              ? 'linear-gradient(135deg, #252941 0%, #2A2E4D 100%)'
                              : '#262626',
                            transform: 'translateY(-2px)',
                            boxShadow: event.status === 'pending'
                              ? '0 4px 20px rgba(91, 99, 211, 0.15)'
                              : '0 4px 12px rgba(0, 0, 0, 0.2)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              color: '#FCFCFC',
                              lineHeight: 1.2,
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {event.plan_title}
                          </Typography>

                          <Box 
                            sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '64px',
                              height: '24px',
                              borderRadius: '12px',
                              ml: 2,
                              ...(event.status === 'pending' ? {
                                bgcolor: 'rgba(34, 197, 94, 0.15)',
                                color: '#4ADE80',
                              } : {
                                bgcolor: 'rgba(255, 86, 86, 0.15)',
                                color: '#FF5656',
                              })
                            }}
                          >
                            <Typography sx={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold',
                              letterSpacing: '0.02em',
                            }}>
                              {event.status === 'pending' ? '受付中' : '締切'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.75,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                          }}>
                            <PersonIcon sx={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '0.75rem',
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontWeight: '500',
                              }}
                            >
                              {event.creator.name}
                            </Typography>
                          </Box>

                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.75,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            flex: 1,
                          }}>
                            <EventIcon sx={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '0.75rem',
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontWeight: '500',
                              }}
                            >
                              {dayjs(event.deadline).format('YYYY/M/D HH:mm')}まで
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}

                {recentClosedEvents.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontSize: '0.875rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontWeight: '500',
                        pl: 0.5,
                      }}
                    >
                      最近締め切られたイベント
                    </Typography>
                    {recentClosedEvents.map((event) => (
                      <Paper
                        key={event.plan_id}
                        onClick={() => handlePlanClick(event.plan_id)}
                        sx={{
                          bgcolor: event.status === 'pending' 
                            ? 'transparent'
                            : '#1D1D21',
                          background: event.status === 'pending'
                            ? 'linear-gradient(135deg, #1D1D21 0%, #252941 100%)'
                            : '#1D1D21',
                          p: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.5,
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: event.status === 'pending'
                            ? 'rgba(142, 147, 218, 0.1)'
                            : 'rgba(255, 255, 255, 0.05)',
                          '&:hover': {
                            background: event.status === 'pending'
                              ? 'linear-gradient(135deg, #252941 0%, #2A2E4D 100%)'
                              : '#262626',
                            transform: 'translateY(-2px)',
                            boxShadow: event.status === 'pending'
                              ? '0 4px 20px rgba(91, 99, 211, 0.15)'
                              : '0 4px 12px rgba(0, 0, 0, 0.2)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              color: '#FCFCFC',
                              lineHeight: 1.2,
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {event.plan_title}
                          </Typography>

                          <Box 
                            sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '64px',
                              height: '24px',
                              borderRadius: '12px',
                              ml: 2,
                              ...(event.status === 'pending' ? {
                                bgcolor: 'rgba(34, 197, 94, 0.15)',
                                color: '#4ADE80',
                              } : {
                                bgcolor: 'rgba(255, 86, 86, 0.15)',
                                color: '#FF5656',
                              })
                            }}
                          >
                            <Typography sx={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold',
                              letterSpacing: '0.02em',
                            }}>
                              {event.status === 'pending' ? '受付中' : '締切'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.75,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                          }}>
                            <PersonIcon sx={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '0.75rem',
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontWeight: '500',
                              }}
                            >
                              {event.creator.name}
                            </Typography>
                          </Box>

                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.75,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            flex: 1,
                          }}>
                            <EventIcon sx={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '0.75rem',
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontWeight: '500',
                              }}
                            >
                              {dayjs(event.deadline).format('YYYY/M/D HH:mm')}まで
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  textAlign: 'center',
                  fontSize: '0.875rem'
                }}
              >
                表示できるイベントはありません
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
      <FooterMenu />
    </Box>
  );
};

export default PlanMainPage; 